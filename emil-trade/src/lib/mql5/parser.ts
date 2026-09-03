// ═══════════════════════════════════════════════════════════
// EMIL TRADE — MQL5 Parser (AST Builder)
// Transforms token stream into Abstract Syntax Tree
// ═══════════════════════════════════════════════════════════

import type {
  MQL5Token,
  ASTNode,
  ProgramNode,
  PreprocessorNode,
  InputDeclarationNode,
  FunctionDeclarationNode,
  ParameterNode,
  VariableDeclarationNode,
  CallExpressionNode,
  BinaryExpressionNode,
  IfStatementNode,
  ForStatementNode,
  ReturnStatementNode,
  LiteralNode,
  IdentifierNode,
  MemberExpressionNode,
  AssignmentExpressionNode,
} from '@/types/converter';
import { MQL5_KEYWORDS } from '@/types/converter';

const TYPE_KEYWORDS = new Set([
  'int', 'uint', 'long', 'ulong', 'short', 'ushort', 'char', 'uchar',
  'double', 'float', 'bool', 'string', 'datetime', 'color', 'void',
]);

export class MQL5Parser {
  private tokens: MQL5Token[];
  private pos: number;
  private errors: { message: string; line: number; column: number }[];

  constructor(tokens: MQL5Token[]) {
    this.tokens = tokens.filter(t => t.type !== 'comment' && t.type !== 'whitespace');
    this.pos = 0;
    this.errors = [];
  }

  parse(): { ast: ProgramNode; errors: { message: string; line: number; column: number }[] } {
    const body: ASTNode[] = [];
    const preprocessorDirectives: PreprocessorNode[] = [];

    while (!this.isAtEnd()) {
      try {
        const node = this.parseTopLevel();
        if (node) {
          if (node.type === 'preprocessor_directive') {
            preprocessorDirectives.push(node as PreprocessorNode);
          }
          body.push(node);
        }
      } catch (e) {
        const tok = this.current();
        this.errors.push({
          message: e instanceof Error ? e.message : 'Unknown parse error',
          line: tok.line,
          column: tok.column,
        });
        this.advance();
      }
    }

    return {
      ast: {
        type: 'program',
        body,
        preprocessorDirectives,
        line: 1,
        column: 1,
      },
      errors: this.errors,
    };
  }

  private parseTopLevel(): ASTNode | null {
    const tok = this.current();

    if (tok.type === 'preprocessor') {
      return this.parsePreprocessor();
    }

    if (tok.type === 'keyword' && tok.value === 'input') {
      return this.parseInputDeclaration();
    }

    if (tok.type === 'keyword' && tok.value === 'sinput') {
      return this.parseInputDeclaration();
    }

    if (tok.type === 'keyword' && (tok.value === 'enum')) {
      return this.parseEnumDeclaration();
    }

    if (tok.type === 'keyword' && (tok.value === 'class')) {
      return this.parseClassDeclaration();
    }

    if (tok.type === 'keyword' && (tok.value === 'struct')) {
      return this.parseStructDeclaration();
    }

    if (this.isTypeToken(tok) || (tok.type === 'keyword' && (tok.value === 'static' || tok.value === 'const' || tok.value === 'extern'))) {
      return this.parseDeclarationOrFunction();
    }

    if (tok.type === 'identifier' || tok.type === 'builtin') {
      return this.parseDeclarationOrFunction();
    }

    if (tok.type === 'eof') return null;

    this.advance();
    return null;
  }

  private parsePreprocessor(): PreprocessorNode {
    const tok = this.current();
    this.advance();
    const parts = tok.value.match(/^#(\w+)\s*(.*)/);
    return {
      type: 'preprocessor_directive',
      directive: parts?.[1] ?? '',
      value: parts?.[2] ?? '',
      line: tok.line,
      column: tok.column,
    };
  }

  private parseInputDeclaration(): InputDeclarationNode {
    const startTok = this.current();
    this.advance(); // skip 'input' / 'sinput'

    const dataType = this.parseTypeName();
    const nameTok = this.current();
    const name = nameTok.value;
    this.advance();

    let defaultValue: string | number | boolean | null = null;
    if (this.match('operator', '=')) {
      defaultValue = this.parseDefaultValue();
    }

    let comment = '';
    this.expect('punctuation', ';');

    // Check for trailing comment on same line in original tokens
    const allTokens = this.tokens;
    const nextIdx = this.pos;
    if (nextIdx < allTokens.length && allTokens[nextIdx].type === 'comment' &&
        allTokens[nextIdx].line === startTok.line) {
      comment = allTokens[nextIdx].value.replace(/^\/\/\s*/, '');
    }

    return {
      type: 'input_declaration',
      dataType,
      name,
      defaultValue,
      comment,
      line: startTok.line,
      column: startTok.column,
    };
  }

  private parseDeclarationOrFunction(): ASTNode {
    const savedPos = this.pos;

    let isStatic = false;
    let isConst = false;

    while (this.current().value === 'static' || this.current().value === 'const' || this.current().value === 'extern') {
      if (this.current().value === 'static') isStatic = true;
      if (this.current().value === 'const') isConst = true;
      this.advance();
    }

    const returnType = this.parseTypeName();
    if (this.isAtEnd()) {
      this.pos = savedPos;
      this.advance();
      return { type: 'expression_statement', line: this.tokens[savedPos].line, column: this.tokens[savedPos].column };
    }

    const nameTok = this.current();
    if (nameTok.type !== 'identifier' && nameTok.type !== 'builtin') {
      this.pos = savedPos;
      return this.parseExpressionStatement();
    }
    const name = nameTok.value;
    this.advance();

    // Function declaration
    if (this.check('punctuation', '(')) {
      return this.parseFunctionDeclaration(returnType, name, nameTok);
    }

    // Variable declaration (possibly with array)
    if (this.check('punctuation', '[')) {
      this.advance(); // [
      while (!this.check('punctuation', ']') && !this.isAtEnd()) this.advance();
      if (this.check('punctuation', ']')) this.advance();
    }

    let initializer: ASTNode | undefined;
    if (this.match('operator', '=')) {
      initializer = this.parseExpression();
    }

    this.match('punctuation', ';');

    const node: VariableDeclarationNode = {
      type: 'variable_declaration',
      dataType: returnType,
      name,
      initializer,
      isStatic,
      isConst,
      line: nameTok.line,
      column: nameTok.column,
    };
    return node;
  }

  private parseFunctionDeclaration(
    returnType: string,
    name: string,
    nameTok: MQL5Token,
  ): FunctionDeclarationNode {
    this.expect('punctuation', '(');
    const params = this.parseParameterList();
    this.expect('punctuation', ')');

    // Optional const qualifier
    if (this.check('keyword', 'const')) this.advance();

    const body = this.parseBlock();

    return {
      type: 'function_declaration',
      returnType,
      name,
      params,
      body,
      line: nameTok.line,
      column: nameTok.column,
    };
  }

  private parseParameterList(): ParameterNode[] {
    const params: ParameterNode[] = [];
    if (this.check('punctuation', ')')) return params;

    do {
      const tok = this.current();
      let dataType = this.parseTypeName();

      // Handle reference params (& prefix)
      if (this.check('operator', '&')) {
        dataType += '&';
        this.advance();
      }

      // Handle array params
      if (this.check('punctuation', '[')) {
        dataType += '[]';
        this.advance();
        if (this.check('punctuation', ']')) this.advance();
      }

      const paramName = this.current().value;
      this.advance();

      // Handle array suffix on name
      if (this.check('punctuation', '[')) {
        dataType += '[]';
        this.advance();
        if (this.check('punctuation', ']')) this.advance();
      }

      let defaultValue: string | number | boolean | null | undefined;
      if (this.match('operator', '=')) {
        defaultValue = this.parseDefaultValue();
      }

      params.push({
        type: 'parameter',
        dataType,
        name: paramName,
        defaultValue,
        line: tok.line,
        column: tok.column,
      });
    } while (this.match('punctuation', ','));

    return params;
  }

  private parseBlock(): ASTNode[] {
    const body: ASTNode[] = [];
    if (!this.match('punctuation', '{')) return body;

    while (!this.check('punctuation', '}') && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) body.push(stmt);
    }
    this.expect('punctuation', '}');
    return body;
  }

  private parseStatement(): ASTNode | null {
    const tok = this.current();

    if (tok.type === 'keyword') {
      switch (tok.value) {
        case 'if': return this.parseIfStatement();
        case 'for': return this.parseForStatement();
        case 'while': return this.parseWhileStatement();
        case 'do': return this.parseDoWhileStatement();
        case 'switch': return this.parseSwitchStatement();
        case 'return': return this.parseReturnStatement();
        case 'break': this.advance(); this.match('punctuation', ';'); return { type: 'break_statement', line: tok.line, column: tok.column };
        case 'continue': this.advance(); this.match('punctuation', ';'); return { type: 'continue_statement', line: tok.line, column: tok.column };
        case 'static':
        case 'const':
          return this.parseDeclarationOrFunction();
        default:
          if (this.isTypeToken(tok)) return this.parseDeclarationOrFunction();
          return this.parseExpressionStatement();
      }
    }

    if (tok.type === 'type' || (tok.type === 'identifier' && this.isLikelyDeclaration())) {
      return this.parseDeclarationOrFunction();
    }

    return this.parseExpressionStatement();
  }

  private parseIfStatement(): IfStatementNode {
    const tok = this.current();
    this.advance(); // if
    this.expect('punctuation', '(');
    const condition = this.parseExpression();
    this.expect('punctuation', ')');

    const consequent = this.check('punctuation', '{')
      ? this.parseBlock()
      : [this.parseStatement()].filter(Boolean) as ASTNode[];

    let alternate: ASTNode[] | undefined;
    if (this.match('keyword', 'else')) {
      alternate = this.check('punctuation', '{')
        ? this.parseBlock()
        : [this.parseStatement()].filter(Boolean) as ASTNode[];
    }

    return {
      type: 'if_statement',
      condition,
      consequent,
      alternate,
      line: tok.line,
      column: tok.column,
    };
  }

  private parseForStatement(): ForStatementNode {
    const tok = this.current();
    this.advance(); // for
    this.expect('punctuation', '(');

    let init: ASTNode | null = null;
    if (!this.check('punctuation', ';')) {
      if (this.isTypeToken(this.current()) || this.current().value === 'int') {
        init = this.parseDeclarationOrFunction();
      } else {
        init = this.parseExpression();
        this.match('punctuation', ';');
      }
    } else {
      this.advance();
    }

    let test: ASTNode | null = null;
    if (!this.check('punctuation', ';')) {
      test = this.parseExpression();
    }
    this.match('punctuation', ';');

    let update: ASTNode | null = null;
    if (!this.check('punctuation', ')')) {
      update = this.parseExpression();
    }
    this.expect('punctuation', ')');

    const body = this.check('punctuation', '{')
      ? this.parseBlock()
      : [this.parseStatement()].filter(Boolean) as ASTNode[];

    return {
      type: 'for_statement',
      init,
      test,
      update,
      body,
      line: tok.line,
      column: tok.column,
    };
  }

  private parseWhileStatement(): ASTNode {
    const tok = this.current();
    this.advance(); // while
    this.expect('punctuation', '(');
    const condition = this.parseExpression();
    this.expect('punctuation', ')');
    const body = this.check('punctuation', '{')
      ? this.parseBlock()
      : [this.parseStatement()].filter(Boolean) as ASTNode[];
    return { type: 'while_statement', condition, body, line: tok.line, column: tok.column };
  }

  private parseDoWhileStatement(): ASTNode {
    const tok = this.current();
    this.advance(); // do
    const body = this.parseBlock();
    this.expect('keyword', 'while');
    this.expect('punctuation', '(');
    const condition = this.parseExpression();
    this.expect('punctuation', ')');
    this.match('punctuation', ';');
    return { type: 'while_statement', condition, body, line: tok.line, column: tok.column, isDo: true };
  }

  private parseSwitchStatement(): ASTNode {
    const tok = this.current();
    this.advance(); // switch
    this.expect('punctuation', '(');
    const discriminant = this.parseExpression();
    this.expect('punctuation', ')');
    this.expect('punctuation', '{');

    const cases: ASTNode[] = [];
    while (!this.check('punctuation', '}') && !this.isAtEnd()) {
      if (this.check('keyword', 'case')) {
        this.advance();
        const test = this.parseExpression();
        this.expect('operator', ':');
        const consequent: ASTNode[] = [];
        while (!this.check('keyword', 'case') && !this.check('keyword', 'default') && !this.check('punctuation', '}') && !this.isAtEnd()) {
          const stmt = this.parseStatement();
          if (stmt) consequent.push(stmt);
        }
        cases.push({ type: 'case_clause', test, consequent, line: test.line, column: test.column });
      } else if (this.check('keyword', 'default')) {
        this.advance();
        this.expect('operator', ':');
        const consequent: ASTNode[] = [];
        while (!this.check('keyword', 'case') && !this.check('punctuation', '}') && !this.isAtEnd()) {
          const stmt = this.parseStatement();
          if (stmt) consequent.push(stmt);
        }
        cases.push({ type: 'case_clause', test: null, consequent, line: tok.line, column: tok.column, isDefault: true });
      } else {
        this.advance();
      }
    }
    this.expect('punctuation', '}');

    return { type: 'switch_statement', discriminant, cases, line: tok.line, column: tok.column };
  }

  private parseReturnStatement(): ReturnStatementNode {
    const tok = this.current();
    this.advance(); // return
    let argument: ASTNode | null = null;
    if (!this.check('punctuation', ';')) {
      argument = this.parseExpression();
    }
    this.match('punctuation', ';');
    return { type: 'return_statement', argument, line: tok.line, column: tok.column };
  }

  private parseExpressionStatement(): ASTNode {
    const expr = this.parseExpression();
    this.match('punctuation', ';');
    return { type: 'expression_statement', expression: expr, line: expr.line, column: expr.column };
  }

  // ─── Expression Parsing (Precedence Climbing) ─────────────

  private parseExpression(): ASTNode {
    return this.parseAssignment();
  }

  private parseAssignment(): ASTNode {
    let left = this.parseTernary();
    const tok = this.current();
    if (tok.type === 'operator' && ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='].includes(tok.value)) {
      this.advance();
      const right = this.parseAssignment();
      const node: AssignmentExpressionNode = {
        type: 'assignment_expression',
        operator: tok.value,
        left,
        right,
        line: tok.line,
        column: tok.column,
      };
      left = node;
    }
    return left;
  }

  private parseTernary(): ASTNode {
    const expr = this.parseLogicalOr();
    if (this.match('operator', '?')) {
      const consequent = this.parseExpression();
      this.expect('operator', ':');
      const alternate = this.parseTernary();
      return { type: 'conditional_expression', test: expr, consequent, alternate, line: expr.line, column: expr.column };
    }
    return expr;
  }

  private parseLogicalOr(): ASTNode { return this.parseBinary(this.parseLogicalAnd.bind(this), ['||']); }
  private parseLogicalAnd(): ASTNode { return this.parseBinary(this.parseBitwiseOr.bind(this), ['&&']); }
  private parseBitwiseOr(): ASTNode { return this.parseBinary(this.parseBitwiseXor.bind(this), ['|']); }
  private parseBitwiseXor(): ASTNode { return this.parseBinary(this.parseBitwiseAnd.bind(this), ['^']); }
  private parseBitwiseAnd(): ASTNode { return this.parseBinary(this.parseEquality.bind(this), ['&']); }
  private parseEquality(): ASTNode { return this.parseBinary(this.parseComparison.bind(this), ['==', '!=']); }
  private parseComparison(): ASTNode { return this.parseBinary(this.parseShift.bind(this), ['<', '>', '<=', '>=']); }
  private parseShift(): ASTNode { return this.parseBinary(this.parseAddition.bind(this), ['<<', '>>']); }
  private parseAddition(): ASTNode { return this.parseBinary(this.parseMultiplication.bind(this), ['+', '-']); }
  private parseMultiplication(): ASTNode { return this.parseBinary(this.parseUnary.bind(this), ['*', '/', '%']); }

  private parseBinary(parseNext: () => ASTNode, operators: string[]): ASTNode {
    let left = parseNext();
    while (this.current().type === 'operator' && operators.includes(this.current().value)) {
      const op = this.current();
      this.advance();
      const right = parseNext();
      const node: BinaryExpressionNode = {
        type: 'binary_expression',
        operator: op.value,
        left,
        right,
        line: op.line,
        column: op.column,
      };
      left = node;
    }
    return left;
  }

  private parseUnary(): ASTNode {
    const tok = this.current();
    if (tok.type === 'operator' && ['!', '-', '+', '~', '++', '--'].includes(tok.value)) {
      this.advance();
      const operand = this.parseUnary();
      return { type: 'unary_expression', operator: tok.value, operand, prefix: true, line: tok.line, column: tok.column };
    }
    // Cast expression: (type)expr
    if (this.check('punctuation', '(') && this.isLikelyCast()) {
      this.advance(); // (
      const castType = this.current().value;
      this.advance();
      this.expect('punctuation', ')');
      const operand = this.parseUnary();
      return { type: 'unary_expression', operator: `(${castType})`, operand, prefix: true, line: tok.line, column: tok.column };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): ASTNode {
    let expr = this.parsePrimary();

    while (true) {
      if (this.check('punctuation', '(')) {
        this.advance();
        const args: ASTNode[] = [];
        if (!this.check('punctuation', ')')) {
          do {
            args.push(this.parseAssignment());
          } while (this.match('punctuation', ','));
        }
        this.expect('punctuation', ')');
        const callee = expr.type === 'identifier' ? (expr as IdentifierNode).name :
                       expr.type === 'member_expression' ? this.memberToString(expr as MemberExpressionNode) : '??';
        const node: CallExpressionNode = {
          type: 'call_expression',
          callee,
          arguments: args,
          line: expr.line,
          column: expr.column,
        };
        expr = node;
      } else if (this.check('punctuation', '[')) {
        this.advance();
        const index = this.parseExpression();
        this.expect('punctuation', ']');
        expr = { type: 'index_expression', object: expr, index, line: expr.line, column: expr.column };
      } else if (this.check('operator', '.') || this.check('operator', '->') || this.check('operator', '::')) {
        this.advance();
        const prop = this.current().value;
        this.advance();
        const node: MemberExpressionNode = {
          type: 'member_expression',
          object: expr,
          property: prop,
          line: expr.line,
          column: expr.column,
        };
        expr = node;
      } else if (this.check('operator', '++') || this.check('operator', '--')) {
        const op = this.current().value;
        this.advance();
        expr = { type: 'unary_expression', operator: op, operand: expr, prefix: false, line: expr.line, column: expr.column };
      } else {
        break;
      }
    }
    return expr;
  }

  private parsePrimary(): ASTNode {
    const tok = this.current();

    if (tok.type === 'number') {
      this.advance();
      const val = tok.value.includes('.') ? parseFloat(tok.value) : parseInt(tok.value, tok.value.startsWith('0x') ? 16 : 10);
      const node: LiteralNode = { type: 'literal', value: isNaN(val) ? 0 : val, raw: tok.value, line: tok.line, column: tok.column };
      return node;
    }

    if (tok.type === 'string') {
      this.advance();
      const node: LiteralNode = { type: 'literal', value: tok.value, raw: tok.value, line: tok.line, column: tok.column };
      return node;
    }

    if (tok.type === 'keyword' && (tok.value === 'true' || tok.value === 'false')) {
      this.advance();
      const node: LiteralNode = { type: 'literal', value: tok.value === 'true', raw: tok.value, line: tok.line, column: tok.column };
      return node;
    }

    if (tok.type === 'keyword' && tok.value === 'NULL') {
      this.advance();
      const node: LiteralNode = { type: 'literal', value: null, raw: 'NULL', line: tok.line, column: tok.column };
      return node;
    }

    if (tok.type === 'keyword' && tok.value === 'new') {
      this.advance();
      const className = this.current().value;
      this.advance();
      this.expect('punctuation', '(');
      const args: ASTNode[] = [];
      if (!this.check('punctuation', ')')) {
        do { args.push(this.parseAssignment()); } while (this.match('punctuation', ','));
      }
      this.expect('punctuation', ')');
      return { type: 'call_expression', callee: `new ${className}`, arguments: args, line: tok.line, column: tok.column } as CallExpressionNode;
    }

    if (tok.type === 'identifier' || tok.type === 'builtin' || tok.type === 'enum_value' || tok.type === 'type') {
      this.advance();
      const node: IdentifierNode = { type: 'identifier', name: tok.value, line: tok.line, column: tok.column };
      return node;
    }

    if (this.check('punctuation', '(')) {
      this.advance();
      const expr = this.parseExpression();
      this.expect('punctuation', ')');
      return expr;
    }

    if (this.check('punctuation', '{')) {
      return this.parseArrayInitializer(tok);
    }

    this.advance();
    return { type: 'literal', value: null, raw: tok.value, line: tok.line, column: tok.column } as LiteralNode;
  }

  private parseArrayInitializer(tok: MQL5Token): ASTNode {
    this.advance(); // {
    const elements: ASTNode[] = [];
    if (!this.check('punctuation', '}')) {
      do {
        elements.push(this.parseAssignment());
      } while (this.match('punctuation', ','));
    }
    this.match('punctuation', '}');
    return { type: 'array_literal', elements, line: tok.line, column: tok.column };
  }

  // ─── Enum / Class / Struct Parsing ────────────────────────

  private parseEnumDeclaration(): ASTNode {
    const tok = this.current();
    this.advance(); // enum
    const name = this.current().value;
    this.advance();
    this.expect('punctuation', '{');
    const members: { name: string; value?: string }[] = [];
    while (!this.check('punctuation', '}') && !this.isAtEnd()) {
      const memberName = this.current().value;
      this.advance();
      let memberValue: string | undefined;
      if (this.match('operator', '=')) {
        memberValue = this.current().value;
        this.advance();
      }
      members.push({ name: memberName, value: memberValue });
      this.match('punctuation', ',');
    }
    this.expect('punctuation', '}');
    this.match('punctuation', ';');
    return { type: 'enum_declaration', name, members, line: tok.line, column: tok.column };
  }

  private parseClassDeclaration(): ASTNode {
    const tok = this.current();
    this.advance(); // class
    const name = this.current().value;
    this.advance();
    let baseClass: string | undefined;
    if (this.match('operator', ':')) {
      if (this.check('keyword', 'public') || this.check('keyword', 'private') || this.check('keyword', 'protected')) {
        this.advance();
      }
      baseClass = this.current().value;
      this.advance();
    }
    const body = this.parseClassBody();
    this.match('punctuation', ';');
    return { type: 'class_declaration', name, baseClass, body, line: tok.line, column: tok.column };
  }

  private parseStructDeclaration(): ASTNode {
    const tok = this.current();
    this.advance(); // struct
    const name = this.current().value;
    this.advance();
    const body = this.parseClassBody();
    this.match('punctuation', ';');
    return { type: 'struct_declaration', name, body, line: tok.line, column: tok.column };
  }

  private parseClassBody(): ASTNode[] {
    const body: ASTNode[] = [];
    if (!this.match('punctuation', '{')) return body;
    while (!this.check('punctuation', '}') && !this.isAtEnd()) {
      // Skip access specifiers
      if (this.check('keyword', 'public') || this.check('keyword', 'private') || this.check('keyword', 'protected')) {
        this.advance();
        this.match('operator', ':');
        continue;
      }
      const node = this.parseTopLevel();
      if (node) body.push(node);
    }
    this.expect('punctuation', '}');
    return body;
  }

  // ─── Helpers ──────────────────────────────────────────────

  private parseTypeName(): string {
    let typeName = this.current().value;
    this.advance();
    // Handle templated types and scope
    if (this.check('operator', '<')) {
      typeName += '<';
      this.advance();
      typeName += this.current().value;
      this.advance();
      if (this.check('operator', '>')) {
        typeName += '>';
        this.advance();
      }
    }
    if (this.check('operator', '::')) {
      typeName += '::';
      this.advance();
      typeName += this.current().value;
      this.advance();
    }
    // Array type
    if (this.check('punctuation', '[')) {
      typeName += '[]';
      this.advance();
      if (this.check('punctuation', ']')) this.advance();
    }
    // Pointer
    if (this.check('operator', '*')) {
      typeName += '*';
      this.advance();
    }
    return typeName;
  }

  private parseDefaultValue(): string | number | boolean | null {
    const tok = this.current();
    if (tok.type === 'number') {
      this.advance();
      return tok.value.includes('.') ? parseFloat(tok.value) : parseInt(tok.value);
    }
    if (tok.type === 'string') {
      this.advance();
      return tok.value;
    }
    if (tok.value === 'true') { this.advance(); return true; }
    if (tok.value === 'false') { this.advance(); return false; }
    if (tok.value === 'NULL') { this.advance(); return null; }
    // Negative numbers
    if (tok.type === 'operator' && tok.value === '-') {
      this.advance();
      const num = this.current();
      if (num.type === 'number') {
        this.advance();
        return -(num.value.includes('.') ? parseFloat(num.value) : parseInt(num.value));
      }
    }
    // Enum or identifier default
    const val = tok.value;
    this.advance();
    return val;
  }

  private memberToString(node: MemberExpressionNode): string {
    const obj = node.object.type === 'identifier'
      ? (node.object as IdentifierNode).name
      : node.object.type === 'member_expression'
        ? this.memberToString(node.object as MemberExpressionNode)
        : '??';
    return `${obj}.${node.property}`;
  }

  private isTypeToken(tok: MQL5Token): boolean {
    return tok.type === 'type' || TYPE_KEYWORDS.has(tok.value);
  }

  private isLikelyDeclaration(): boolean {
    // Lookahead: if current identifier followed by another identifier, likely a type + varName
    if (this.pos + 1 < this.tokens.length) {
      const next = this.tokens[this.pos + 1];
      return next.type === 'identifier' || next.type === 'builtin';
    }
    return false;
  }

  private isLikelyCast(): boolean {
    // (type)expr pattern
    if (this.pos + 2 < this.tokens.length) {
      const inner = this.tokens[this.pos + 1];
      const close = this.tokens[this.pos + 2];
      return (inner.type === 'type' || TYPE_KEYWORDS.has(inner.value)) && close.value === ')';
    }
    return false;
  }

  private current(): MQL5Token {
    return this.tokens[this.pos] ?? { type: 'eof', value: '', line: 0, column: 0, offset: 0 };
  }

  private advance(): MQL5Token {
    const tok = this.current();
    if (this.pos < this.tokens.length) this.pos++;
    return tok;
  }

  private check(type: string, value?: string): boolean {
    const tok = this.current();
    if (tok.type !== type) return false;
    if (value !== undefined && tok.value !== value) return false;
    return true;
  }

  private match(type: string, value?: string): boolean {
    if (this.check(type, value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(type: string, value?: string): MQL5Token {
    if (this.check(type, value)) {
      return this.advance();
    }
    const tok = this.current();
    this.errors.push({
      message: `Expected ${type}${value ? ` '${value}'` : ''}, got ${tok.type} '${tok.value}'`,
      line: tok.line,
      column: tok.column,
    });
    return tok;
  }

  private isAtEnd(): boolean {
    return this.pos >= this.tokens.length || this.current().type === 'eof';
  }
}
