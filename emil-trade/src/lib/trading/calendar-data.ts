export type CalendarImpact = 'high' | 'medium' | 'low';

export interface CalendarEvent {
  id: string;
  title: string;
  currency: string;
  impact: CalendarImpact;
  forecast: string | null;
  previous: string;
  actual: string | null;
  datetime: Date;
  description: string;
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

export function generateCalendarEvents(): CalendarEvent[] {
  const now = new Date();
  const monday = getMonday(now);

  function dayAt(dayOffset: number, hour: number, minute: number): Date {
    const d = new Date(monday);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d;
  }

  const isPast = (d: Date) => d.getTime() < now.getTime();

  const raw: Omit<CalendarEvent, 'id'>[] = [
    // Monday
    { title: 'Manufacturing PMI', currency: 'CNY', impact: 'medium', forecast: '50.5', previous: '50.2', actual: null, datetime: dayAt(0, 1, 45), description: 'China Caixin Manufacturing PMI measures factory activity.' },
    { title: 'Final Manufacturing PMI', currency: 'EUR', impact: 'low', forecast: '45.8', previous: '45.7', actual: null, datetime: dayAt(0, 4, 0), description: 'Eurozone final manufacturing PMI reading for the month.' },
    { title: 'ISM Manufacturing PMI', currency: 'USD', impact: 'high', forecast: '48.5', previous: '47.8', actual: null, datetime: dayAt(0, 10, 0), description: 'ISM Manufacturing PMI measures factory sector health in the US.' },
    { title: 'ISM Manufacturing Prices', currency: 'USD', impact: 'medium', forecast: '53.0', previous: '52.5', actual: null, datetime: dayAt(0, 10, 0), description: 'Price component of the ISM manufacturing survey.' },
    { title: 'Construction Spending m/m', currency: 'USD', impact: 'low', forecast: '0.3%', previous: '0.2%', actual: null, datetime: dayAt(0, 10, 0), description: 'Monthly change in total construction spending.' },

    // Tuesday
    { title: 'Cash Rate', currency: 'AUD', impact: 'high', forecast: '4.35%', previous: '4.35%', actual: null, datetime: dayAt(1, 0, 30), description: 'Reserve Bank of Australia interest rate decision.' },
    { title: 'RBA Rate Statement', currency: 'AUD', impact: 'high', forecast: null, previous: '-', actual: null, datetime: dayAt(1, 0, 30), description: 'RBA monetary policy statement accompanying rate decision.' },
    { title: 'CPI Flash Estimate y/y', currency: 'EUR', impact: 'high', forecast: '2.4%', previous: '2.6%', actual: null, datetime: dayAt(1, 5, 0), description: 'Eurozone flash CPI estimate, key inflation indicator.' },
    { title: 'Core CPI Flash Estimate y/y', currency: 'EUR', impact: 'high', forecast: '2.7%', previous: '2.9%', actual: null, datetime: dayAt(1, 5, 0), description: 'Eurozone core CPI excluding food and energy.' },
    { title: 'JOLTS Job Openings', currency: 'USD', impact: 'high', forecast: '8.73M', previous: '8.76M', actual: null, datetime: dayAt(1, 10, 0), description: 'US job openings, a key labor market indicator.' },

    // Wednesday
    { title: 'GDP q/q', currency: 'AUD', impact: 'high', forecast: '0.3%', previous: '0.2%', actual: null, datetime: dayAt(2, 0, 30), description: 'Australian quarterly GDP growth.' },
    { title: 'Services PMI', currency: 'CNY', impact: 'medium', forecast: '52.5', previous: '52.0', actual: null, datetime: dayAt(2, 1, 45), description: 'China Caixin Services PMI.' },
    { title: 'ADP Non-Farm Employment Change', currency: 'USD', impact: 'high', forecast: '175K', previous: '164K', actual: null, datetime: dayAt(2, 8, 15), description: 'ADP private sector employment change, NFP preview.' },
    { title: 'ISM Services PMI', currency: 'USD', impact: 'high', forecast: '52.0', previous: '51.4', actual: null, datetime: dayAt(2, 10, 0), description: 'ISM non-manufacturing PMI for the services sector.' },
    { title: 'Crude Oil Inventories', currency: 'USD', impact: 'medium', forecast: '-1.2M', previous: '-3.4M', actual: null, datetime: dayAt(2, 10, 30), description: 'Weekly change in crude oil stocks held by commercial firms.' },
    { title: 'BOC Rate Statement', currency: 'CAD', impact: 'high', forecast: null, previous: '-', actual: null, datetime: dayAt(2, 9, 45), description: 'Bank of Canada monetary policy statement.' },
    { title: 'Overnight Rate', currency: 'CAD', impact: 'high', forecast: '4.50%', previous: '4.50%', actual: null, datetime: dayAt(2, 9, 45), description: 'Bank of Canada interest rate decision.' },

    // Thursday
    { title: 'Trade Balance', currency: 'AUD', impact: 'medium', forecast: '10.5B', previous: '11.0B', actual: null, datetime: dayAt(3, 0, 30), description: 'Australian monthly trade balance.' },
    { title: 'Retail Sales m/m', currency: 'EUR', impact: 'medium', forecast: '0.2%', previous: '-0.3%', actual: null, datetime: dayAt(3, 5, 0), description: 'Eurozone monthly retail sales change.' },
    { title: 'Unemployment Claims', currency: 'USD', impact: 'high', forecast: '215K', previous: '211K', actual: null, datetime: dayAt(3, 8, 30), description: 'Weekly initial jobless claims in the US.' },
    { title: 'Trade Balance', currency: 'USD', impact: 'medium', forecast: '-68.5B', previous: '-67.4B', actual: null, datetime: dayAt(3, 8, 30), description: 'US monthly trade balance.' },
    { title: 'Prelim Unit Labor Costs q/q', currency: 'USD', impact: 'medium', forecast: '0.8%', previous: '0.5%', actual: null, datetime: dayAt(3, 8, 30), description: 'Preliminary quarterly change in unit labor costs.' },
    { title: 'BOE Monetary Policy Summary', currency: 'GBP', impact: 'high', forecast: null, previous: '-', actual: null, datetime: dayAt(3, 7, 0), description: 'Bank of England monetary policy summary and minutes.' },
    { title: 'Official Bank Rate', currency: 'GBP', impact: 'high', forecast: '5.25%', previous: '5.25%', actual: null, datetime: dayAt(3, 7, 0), description: 'Bank of England interest rate decision.' },

    // Friday
    { title: 'Non-Farm Employment Change', currency: 'USD', impact: 'high', forecast: '185K', previous: '175K', actual: null, datetime: dayAt(4, 8, 30), description: 'US Non-Farm Payrolls, the most impactful jobs report.' },
    { title: 'Unemployment Rate', currency: 'USD', impact: 'high', forecast: '3.9%', previous: '3.8%', actual: null, datetime: dayAt(4, 8, 30), description: 'US monthly unemployment rate.' },
    { title: 'Average Hourly Earnings m/m', currency: 'USD', impact: 'high', forecast: '0.3%', previous: '0.2%', actual: null, datetime: dayAt(4, 8, 30), description: 'Monthly change in average hourly earnings, wage inflation.' },
    { title: 'Employment Change', currency: 'CAD', impact: 'high', forecast: '25.0K', previous: '41.4K', actual: null, datetime: dayAt(4, 8, 30), description: 'Canadian monthly employment change.' },
    { title: 'Unemployment Rate', currency: 'CAD', impact: 'medium', forecast: '6.2%', previous: '6.1%', actual: null, datetime: dayAt(4, 8, 30), description: 'Canadian monthly unemployment rate.' },
    { title: 'Ivey PMI', currency: 'CAD', impact: 'medium', forecast: '56.0', previous: '57.5', actual: null, datetime: dayAt(4, 10, 0), description: 'Canadian purchasing managers index.' },

    // Additional events spread across the week
    { title: 'PPI m/m', currency: 'USD', impact: 'high', forecast: '0.2%', previous: '0.3%', actual: null, datetime: dayAt(1, 8, 30), description: 'US Producer Price Index monthly change.' },
    { title: 'Current Account', currency: 'JPY', impact: 'medium', forecast: '2.45T', previous: '2.58T', actual: null, datetime: dayAt(0, 19, 50), description: 'Japan current account balance.' },
    { title: 'GDP q/q', currency: 'GBP', impact: 'high', forecast: '0.1%', previous: '0.0%', actual: null, datetime: dayAt(2, 2, 0), description: 'UK quarterly GDP growth.' },
    { title: 'Trade Balance', currency: 'CHF', impact: 'medium', forecast: '4.2B', previous: '3.9B', actual: null, datetime: dayAt(1, 2, 0), description: 'Swiss monthly trade balance.' },
    { title: 'CPI m/m', currency: 'CHF', impact: 'high', forecast: '0.1%', previous: '0.0%', actual: null, datetime: dayAt(3, 2, 30), description: 'Swiss consumer price index monthly change.' },
    { title: 'Employment Change q/q', currency: 'NZD', impact: 'high', forecast: '0.4%', previous: '0.3%', actual: null, datetime: dayAt(1, 17, 45), description: 'New Zealand quarterly employment change.' },
    { title: 'Unemployment Rate', currency: 'NZD', impact: 'high', forecast: '4.3%', previous: '4.2%', actual: null, datetime: dayAt(1, 17, 45), description: 'New Zealand quarterly unemployment rate.' },
    { title: 'Monetary Policy Statement', currency: 'JPY', impact: 'high', forecast: null, previous: '-', actual: null, datetime: dayAt(3, 3, 0), description: 'Bank of Japan monetary policy statement.' },
    { title: 'BOJ Policy Rate', currency: 'JPY', impact: 'high', forecast: '0.10%', previous: '0.10%', actual: null, datetime: dayAt(3, 3, 0), description: 'Bank of Japan interest rate decision.' },
    { title: 'Industrial Production m/m', currency: 'EUR', impact: 'medium', forecast: '-0.5%', previous: '1.2%', actual: null, datetime: dayAt(2, 5, 0), description: 'Eurozone monthly industrial production change.' },
    { title: 'Retail Sales m/m', currency: 'GBP', impact: 'medium', forecast: '0.5%', previous: '-0.3%', actual: null, datetime: dayAt(4, 2, 0), description: 'UK monthly retail sales change.' },
    { title: 'CPI y/y', currency: 'GBP', impact: 'high', forecast: '3.2%', previous: '3.4%', actual: null, datetime: dayAt(2, 2, 0), description: 'UK annual consumer price inflation.' },
    { title: 'Building Permits', currency: 'USD', impact: 'medium', forecast: '1.48M', previous: '1.47M', actual: null, datetime: dayAt(3, 8, 30), description: 'US monthly building permits issued.' },
    { title: 'Consumer Confidence', currency: 'USD', impact: 'high', forecast: '104.5', previous: '103.0', actual: null, datetime: dayAt(1, 10, 0), description: 'Conference Board Consumer Confidence Index.' },
  ];

  // Assign actual values to past events
  return raw.map((ev, i) => {
    const event: CalendarEvent = { ...ev, id: `cal-${i + 1}` };
    if (isPast(event.datetime) && event.forecast) {
      // Generate realistic actual values slightly different from forecast
      const forecastNum = parseFloat(event.forecast.replace(/[%KMBkTt,]/g, ''));
      if (!isNaN(forecastNum)) {
        const variance = forecastNum * (Math.random() * 0.1 - 0.05);
        const actualNum = forecastNum + variance;

        // Format to match forecast style
        if (event.forecast.includes('%')) {
          event.actual = `${actualNum.toFixed(1)}%`;
        } else if (event.forecast.includes('K')) {
          event.actual = `${Math.round(actualNum)}K`;
        } else if (event.forecast.includes('M')) {
          event.actual = `${actualNum.toFixed(2)}M`;
        } else if (event.forecast.includes('B')) {
          event.actual = `${actualNum.toFixed(1)}B`;
        } else if (event.forecast.includes('T')) {
          event.actual = `${actualNum.toFixed(2)}T`;
        } else {
          event.actual = `${actualNum.toFixed(1)}`;
        }
      }
    }
    return event;
  }).sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
}

export const CURRENCY_COLORS: Record<string, string> = {
  USD: '#3B82F6',
  EUR: '#22C55E',
  GBP: '#EF4444',
  JPY: '#A855F7',
  AUD: '#F59E0B',
  CAD: '#EC4899',
  CHF: '#F97316',
  NZD: '#06B6D4',
  CNY: '#DC2626',
};
