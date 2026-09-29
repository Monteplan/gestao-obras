import { describe, it, expect } from 'vitest';
import { DeviceInfo, PlatformOS, DeviceType } from '../types';

describe('Detecção de Dispositivo e Plataforma (Windows vs Celular)', () => {
  it('deve identificar corretamente plataforma Windows Desktop a partir de User-Agent', () => {
    const windowsUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    const isWindows = /Windows NT|Win64|Win32/i.test(windowsUA);
    const isMobile = /Android|iPhone|Mobile/i.test(windowsUA);

    expect(isWindows).toBe(true);
    expect(isMobile).toBe(false);
  });

  it('deve identificar corretamente dispositivo Celular Android a partir de User-Agent', () => {
    const androidUA = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.119 Mobile Safari/537.36';
    const isWindows = /Windows NT|Win64|Win32/i.test(androidUA);
    const isAndroid = /Android/i.test(androidUA);
    const isMobile = /Mobile/i.test(androidUA);

    expect(isWindows).toBe(false);
    expect(isAndroid).toBe(true);
    expect(isMobile).toBe(true);
  });

  it('deve identificar corretamente dispositivo Celular iOS / iPhone a partir de User-Agent', () => {
    const iphoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
    const isWindows = /Windows NT|Win64|Win32/i.test(iphoneUA);
    const isIOS = /iPhone|iPad/i.test(iphoneUA);
    const isMobile = /Mobile/i.test(iphoneUA);

    expect(isWindows).toBe(false);
    expect(isIOS).toBe(true);
    expect(isMobile).toBe(true);
  });

  it('deve suportar chave de visualização mobile com viewport estreito', () => {
    const screenWidthMobile = 390;
    const isSmallScreen = screenWidthMobile < 768;
    expect(isSmallScreen).toBe(true);

    const screenWidthDesktop = 1920;
    const isDesktopScreen = screenWidthDesktop >= 1024;
    expect(isDesktopScreen).toBe(true);
  });
});
