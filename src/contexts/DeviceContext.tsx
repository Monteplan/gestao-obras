import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { DeviceInfo, DeviceType, PlatformOS } from '../types';
import { logAudit } from '../lib/supabase';

interface DeviceContextType {
  device: DeviceInfo;
  simulatedDevice: 'auto' | 'mobile' | 'desktop';
  setSimulatedDevice: (mode: 'auto' | 'mobile' | 'desktop') => void;
  isMobileView: boolean;
  isSidebarOpenMobile: boolean;
  setSidebarOpenMobile: (open: boolean) => void;
  toggleSidebarMobile: () => void;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

function detectClientEnvironment(): DeviceInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      deviceType: 'desktop',
      os: 'windows',
      osName: 'Windows Desktop',
      browserName: 'Navegador Web',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isWindows: true,
      isAndroid: false,
      isIOS: false,
      isTouch: false,
      orientation: 'landscape',
      screenWidth: 1920,
      screenHeight: 1080,
      deviceSummary: 'Windows Desktop',
      userAgent: '',
    };
  }

  const ua = navigator.userAgent || '';
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const isTouch = (navigator.maxTouchPoints > 0) || ('ontouchstart' in window);
  const orientation = screenWidth > screenHeight ? 'landscape' : 'portrait';

  // 1. Detectar SO / Plataforma
  let os: PlatformOS = 'other';
  let osName = 'Sistema Operacional';
  let isWindows = false;
  let isAndroid = false;
  let isIOS = false;

  const uaData = (navigator as any).userAgentData;
  const platformHint = uaData?.platform || navigator.platform || '';

  if (/Windows NT 10\.0|Windows NT 11\.0|Windows/i.test(ua) || /Win32|Win64|Windows/i.test(platformHint)) {
    os = 'windows';
    osName = 'Windows';
    isWindows = true;
  } else if (/Android/i.test(ua)) {
    os = 'android';
    osName = 'Android';
    isAndroid = true;
  } else if (/iPhone|iPad|iPod/i.test(ua) || (platformHint === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    os = 'ios';
    osName = /iPad/i.test(ua) ? 'iOS (iPad)' : 'iOS (iPhone)';
    isIOS = true;
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macos';
    osName = 'macOS';
  } else if (/Linux/i.test(ua)) {
    os = 'linux';
    osName = 'Linux';
  }

  // 2. Detectar Navegador
  let browserName = 'Navegador';
  if (/Edg\//i.test(ua)) browserName = 'Microsoft Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browserName = 'Google Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browserName = 'Apple Safari';
  else if (/Firefox\//i.test(ua)) browserName = 'Mozilla Firefox';
  else if (/Opera|OPR\//i.test(ua)) browserName = 'Opera';

  // 3. Determinar Tipo de Dispositivo (Mobile x Tablet x Desktop)
  let deviceType: DeviceType = 'desktop';
  const isMobileUa = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTabletUa = /iPad|Tablet/i.test(ua) || (platformHint === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isMobileUa || screenWidth < 768) {
    deviceType = 'mobile';
  } else if (isTabletUa || (screenWidth >= 768 && screenWidth <= 1024)) {
    deviceType = 'tablet';
  } else {
    deviceType = 'desktop';
  }

  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  const isDesktop = deviceType === 'desktop';

  // Resumo amigável para exibição em badges e cabeçalho
  let deviceSummary = '';
  if (isWindows) {
    deviceSummary = `Windows Desktop (${screenWidth}×${screenHeight})`;
  } else if (isAndroid) {
    deviceSummary = `Celular Android (${screenWidth}×${screenHeight})`;
  } else if (isIOS) {
    deviceSummary = `Celular iOS / iPhone (${screenWidth}×${screenHeight})`;
  } else if (isMobile) {
    deviceSummary = `Dispositivo Móvel (${screenWidth}×${screenHeight})`;
  } else {
    deviceSummary = `${osName} (${screenWidth}×${screenHeight})`;
  }

  return {
    deviceType,
    os,
    osName,
    browserName,
    isMobile,
    isTablet,
    isDesktop,
    isWindows,
    isAndroid,
    isIOS,
    isTouch,
    orientation,
    screenWidth,
    screenHeight,
    deviceSummary,
    userAgent: ua,
  };
}

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [device, setDevice] = useState<DeviceInfo>(detectClientEnvironment);
  const [simulatedDevice, setSimulatedDevice] = useState<'auto' | 'mobile' | 'desktop'>('auto');
  const [isSidebarOpenMobile, setSidebarOpenMobile] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setDevice(detectClientEnvironment());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Registra na trilha de auditoria uma única vez por sessão o dispositivo utilizado
    const sessionKey = 'gestao_obras_device_logged';
    if (!sessionStorage.getItem(sessionKey)) {
      const current = detectClientEnvironment();
      const originDescription = current.isWindows
        ? `Acesso realizado via Windows Desktop (${current.browserName}) - Resolução ${current.screenWidth}x${current.screenHeight}`
        : current.isAndroid
        ? `Acesso realizado via Celular Android (${current.browserName}) - Tela ${current.screenWidth}x${current.screenHeight}`
        : current.isIOS
        ? `Acesso realizado via Celular iOS / iPhone (${current.browserName}) - Tela ${current.screenWidth}x${current.screenHeight}`
        : `Acesso realizado via ${current.deviceSummary} (${current.browserName})`;

      logAudit('LOGIN_DISPOSITIVO', 'Dispositivo', current.os, originDescription);
      sessionStorage.setItem(sessionKey, 'true');
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Fecha o menu lateral móvel ao redimensionar para tela grande
  useEffect(() => {
    if (device.screenWidth >= 768 && isSidebarOpenMobile) {
      setSidebarOpenMobile(false);
    }
  }, [device.screenWidth, isSidebarOpenMobile]);

  // Se o usuário alternar para modo simulado, respeita a escolha manual
  const isMobileView = useMemo(() => {
    if (simulatedDevice === 'mobile') return true;
    if (simulatedDevice === 'desktop') return false;
    return device.isMobile;
  }, [simulatedDevice, device.isMobile]);

  const toggleSidebarMobile = () => {
    setSidebarOpenMobile((prev) => !prev);
  };

  return (
    <DeviceContext.Provider
      value={{
        device,
        simulatedDevice,
        setSimulatedDevice,
        isMobileView,
        isSidebarOpenMobile,
        setSidebarOpenMobile,
        toggleSidebarMobile,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
};

export const useDevice = (): DeviceContextType => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice deve ser usado dentro de um DeviceProvider');
  }
  return context;
};
