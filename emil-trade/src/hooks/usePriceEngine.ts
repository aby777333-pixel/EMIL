'use client';

import { useEffect, useRef, useState } from 'react';
import { PriceEngine } from '@/lib/trading/price-engine';
import { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';
import { useTradingStore } from '@/stores/trading';

export function usePriceEngine() {
  const updatePrice = useTradingStore((s) => s.updatePrice);
  const [isRunning, setIsRunning] = useState(false);
  const [isLiveData, setIsLiveData] = useState(false);

  const priceEngineRef = useRef<PriceEngine | null>(null);
  const ohlcvBuilderRef = useRef<OHLCVBuilder | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Create engine and builder
    const engine = new PriceEngine();
    priceEngineRef.current = engine;

    const builder = new OHLCVBuilder(engine);
    ohlcvBuilderRef.current = builder;

    setReady(true);

    // Seed initial prices into the store
    const allPrices = engine.getAllPrices();
    for (const tick of Object.values(allPrices)) {
      updatePrice(tick);
    }

    // Start the price engine
    engine.start((ticks) => {
      for (const tick of ticks) {
        updatePrice(tick);
        builder.processTick(tick);
      }
      // Sync the live data flag from the engine
      if (engine.isLiveData !== isLiveData) {
        setIsLiveData(engine.isLiveData);
      }
    }, 500);
    setIsRunning(true);

    return () => {
      engine.stop();
      setIsRunning(false);
      priceEngineRef.current = null;
      ohlcvBuilderRef.current = null;
    };
    // updatePrice is stable (from zustand), no re-creation needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    priceEngine: priceEngineRef.current,
    ohlcvBuilder: ready ? ohlcvBuilderRef.current : null,
    isRunning,
    isLiveData,
  };
}
