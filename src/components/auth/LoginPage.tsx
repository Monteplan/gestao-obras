import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MonteplanLogo } from '../common/MonteplanLogo';
import { Lock, Mail, User, Phone, ArrowRight, KeyRound, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, requestAccess, recoverPasswordStep1, recoverPasswordStep2, recoverPasswordStep3 } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form Solicitar Acesso
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Modal de Recuperação de Senha Multi-etapas
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2 | 3 | 4>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    const res = await login(email, password);
    setLoading(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Erro ao realizar login. Verifique seus dados.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    const res = await requestAccess({ name: regName, email: regEmail, phone: regPhone, password: regPassword });
    setLoading(false);
    if (res.success) {
      setSuccessMessage('Solicitação enviada com sucesso! Seu acesso será liberado por um administrador.');
      setTimeout(() => {
        setMode('login');
        setSuccessMessage('');
      }, 2500);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    const updated = [...otpCode];
    updated[index] = val;
    setOtpCode(updated);
    // Auto-focus no próximo
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleForgotStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    if (!forgotEmail) {
      setRecoveryError('Informe um e-mail válido');
      return;
    }
    await recoverPasswordStep1(forgotEmail);
    setRecoveryStep(2);
  };

  const handleForgotStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    const code = otpCode.join('');
    const res = await recoverPasswordStep2(code);
    if (!res.success) {
      setRecoveryError(res.error || 'Código incorreto');
      return;
    }
    setRecoveryStep(3);
  };

  const handleForgotStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    if (newPassword !== confirmPassword) {
      setRecoveryError('As senhas digitadas não coincidem');
      return;
    }
    const res = await recoverPasswordStep3(newPassword);
    if (!res.success) {
      setRecoveryError(res.error || 'Erro ao redefinir senha');
      return;
    }
    setRecoveryStep(4);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-[#081d2c] overflow-hidden">
      {/* Glowing Ambient Background Orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* Main Authentication Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="glass-panel p-8 rounded-3xl shadow-2xl border border-[#1c3e5c]">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <MonteplanLogo variant="full" size="lg" theme="dark" />
            </div>
            <div className="inline-block px-3 py-1 rounded-full bg-[#004171]/50 border border-[#38bdf8]/30 text-[#38bdf8] text-[10px] font-bold tracking-wider uppercase mb-2">
              Gestão de Obras & Engenharia
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {mode === 'login' ? 'Bem-vindo de volta' : 'Solicitar Acesso'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'login'
                ? 'Entre com suas credenciais corporativas Monteplan'
                : 'Preencha seus dados para liberação de acesso'}
            </p>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs text-center font-medium">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs text-center font-medium">
              {successMessage}
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">E-mail Corporativo</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@monteplan.com.br"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs font-medium focus:border-[#38bdf8] transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Senha</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(true);
                      setRecoveryStep(1);
                      setForgotEmail(email);
                    }}
                    className="text-[11px] text-[#38bdf8] hover:text-[#93c5fd] transition-colors font-medium"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs font-medium focus:border-[#38bdf8] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-[#004171] to-[#0a548c] hover:from-[#0a548c] hover:to-[#004171] text-white shadow-lg shadow-[#004171]/40 transition-all transform active:scale-[0.98] flex items-center justify-center space-x-2"
              >
                <span>{loading ? 'Entrando...' : 'Acessar Plataforma'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Botões de Preenchimento Rápido Demo */}
              <div className="pt-3 border-t border-[#1c3e5c] text-center">
                <span className="text-[11px] text-slate-400 block mb-2 font-medium">Contas Monteplan para Teste:</span>
                <div className="flex flex-wrap justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setEmail('admin@monteplan.com.br'); setPassword('admin123'); }}
                    className="px-2 py-1 rounded bg-[#0c2336] text-slate-300 hover:text-white hover:border-[#38bdf8]/50 text-[10px] border border-[#1c3e5c]"
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail('gestor@monteplan.com.br'); setPassword('gestor123'); }}
                    className="px-2 py-1 rounded bg-[#0c2336] text-slate-300 hover:text-white hover:border-[#38bdf8]/50 text-[10px] border border-[#1c3e5c]"
                  >
                    Gestor
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail('compras@monteplan.com.br'); setPassword('compras123'); }}
                    className="px-2 py-1 rounded bg-[#0c2336] text-slate-300 hover:text-white hover:border-[#38bdf8]/50 text-[10px] border border-[#1c3e5c]"
                  >
                    Compras
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail('financeiro@monteplan.com.br'); setPassword('fin123'); }}
                    className="px-2 py-1 rounded bg-[#0c2336] text-slate-300 hover:text-white hover:border-[#38bdf8]/50 text-[10px] border border-[#1c3e5c]"
                  >
                    Financeiro
                  </button>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Novo por aqui? <strong className="text-[#38bdf8]">Solicitar Acesso</strong>
                </button>
              </div>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="João Carlos Silva"
                    className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-xs font-medium focus:border-[#38bdf8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="joao@monteplan.com.br"
                    className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-xs font-medium focus:border-[#38bdf8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Telefone / WhatsApp</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="(81) 98765-4321"
                    className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-xs font-medium focus:border-[#38bdf8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Senha Provisória</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-xs font-medium focus:border-[#38bdf8]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-[#004171] to-[#0a548c] hover:from-[#0a548c] hover:to-[#004171] text-white shadow-lg shadow-[#004171]/40 transition-all mt-2"
              >
                {loading ? 'Enviando Solicitação...' : 'Enviar Solicitação de Acesso'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Já possui conta? <strong className="text-[#38bdf8]">Fazer login</strong>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Modal de Recuperação de Senha Multi-Etapas */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel w-full max-w-sm p-6 rounded-2xl shadow-2xl border border-[#1c3e5c] relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              ×
            </button>

            {recoveryError && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-medium">
                {recoveryError}
              </div>
            )}

            {/* Etapa 1: Enviar Email */}
            {recoveryStep === 1 && (
              <form onSubmit={handleForgotStep1} className="space-y-4">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#004171]/30 text-[#38bdf8] mx-auto flex items-center justify-center mb-2">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Recuperar Senha</h2>
                  <p className="text-xs text-slate-400 mt-1">Informe seu e-mail para enviarmos o código de segurança</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail Cadastrado</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs focus:border-[#38bdf8]"
                    placeholder="seu.email@monteplan.com.br"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#004171] hover:bg-[#0a548c] text-white font-bold text-xs"
                >
                  Enviar Código OTP
                </button>
              </form>
            )}

            {/* Etapa 2: Validar Código de 6 Dígitos */}
            {recoveryStep === 2 && (
              <form onSubmit={handleForgotStep2} className="space-y-4">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#004171]/30 text-[#38bdf8] mx-auto flex items-center justify-center mb-2">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Código de Verificação</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Digite o código de 6 dígitos enviado para <br />
                    <strong className="text-slate-200">{forgotEmail}</strong>
                  </p>
                </div>

                <div className="flex justify-between gap-1.5 my-4">
                  {otpCode.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      className="w-10 h-12 text-center text-lg font-bold rounded-lg glass-input border border-[#1c3e5c] focus:border-[#38bdf8]"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#004171] hover:bg-[#0a548c] text-white font-bold text-xs"
                >
                  Verificar Código
                </button>
              </form>
            )}

            {/* Etapa 3: Criar Nova Senha */}
            {recoveryStep === 3 && (
              <form onSubmit={handleForgotStep3} className="space-y-4">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#004171]/30 text-[#38bdf8] mx-auto flex items-center justify-center mb-2">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Nova Senha</h2>
                  <p className="text-xs text-slate-400 mt-1">Defina uma senha segura para o seu login</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nova Senha</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs focus:border-[#38bdf8]"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Confirmar Senha</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs focus:border-[#38bdf8]"
                    placeholder="Repita a senha"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#004171] hover:bg-[#0a548c] text-white font-bold text-xs"
                >
                  Salvar Nova Senha
                </button>
              </form>
            )}

            {/* Etapa 4: Sucesso */}
            {recoveryStep === 4 && (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#004171]/40 text-[#38bdf8] mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-bold text-white">Senha Redefinida!</h2>
                <p className="text-xs text-slate-300">
                  Sua senha foi alterada com sucesso. Você já pode acessar a plataforma.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 rounded-xl bg-[#004171] hover:bg-[#0a548c] text-white font-bold text-xs"
                >
                  Ir para o Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

