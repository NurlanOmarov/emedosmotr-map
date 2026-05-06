import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  username: z.string().min(1, 'Введите логин'),
  password: z.string().min(1, 'Введите пароль'),
});
type FormData = z.infer<typeof schema>;

const float = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
  50% { transform: translateY(-20px) rotate(180deg); opacity: 0.6; }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.05); opacity: 0.6; }
`;

const Page = styled.div`
  min-height: 100dvh;
  background: #0A1628;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
`;

const BgOrb = styled.div<{ $x: string; $y: string; $size: string; $color: string; $delay: string }>`
  position: absolute;
  left: ${({ $x }) => $x};
  top: ${({ $y }) => $y};
  width: ${({ $size }) => $size};
  height: ${({ $size }) => $size};
  background: ${({ $color }) => $color};
  border-radius: 50%;
  filter: blur(80px);
  animation: ${pulse} 6s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay};
`;

const Grid = styled.div`
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
`;

const Particle = styled.div<{ $x: string; $y: string; $delay: string; $size: string }>`
  position: absolute;
  left: ${({ $x }) => $x};
  top: ${({ $y }) => $y};
  width: ${({ $size }) => $size};
  height: ${({ $size }) => $size};
  background: rgba(59,130,246,0.5);
  border-radius: 50%;
  animation: ${float} ${() => 4 + Math.random() * 4}s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay};
`;

const FormCard = styled(motion.div)`
  width: 400px;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(59,130,246,0.15);
  border-radius: 24px;
  padding: 40px;
  position: relative;
  z-index: 1;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.03),
    0 32px 64px rgba(0,0,0,0.6),
    0 0 80px rgba(59,130,246,0.08);

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 24px; right: 24px; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent);
  }
`;

const Logo = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 36px;
  gap: 12px;
`;

const LogoIcon = styled(motion.div)`
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #1E3A5F, #2563EB);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  box-shadow: 0 0 40px rgba(37,99,235,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
  border: 1px solid rgba(59,130,246,0.3);
`;

const Title = styled.h1`
  font-size: 22px;
  font-weight: 700;
  color: #F1F5F9;
  letter-spacing: -0.02em;
`;

const Subtitle = styled.p`
  font-size: 13px;
  color: #64748B;
  text-align: center;
  margin-top: 4px;
`;

const Field = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #94A3B8;
  margin-bottom: 8px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const Input = styled(motion.input)<{ $error?: boolean }>`
  width: 100%;
  background: rgba(255,255,255,0.04);
  border: 1px solid ${({ $error }) => ($error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)')};
  border-radius: 10px;
  padding: 12px 16px;
  color: #F1F5F9;
  font-size: 14px;
  outline: none;
  transition: all 200ms ease;

  &:focus {
    border-color: rgba(59,130,246,0.5);
    background: rgba(59,130,246,0.05);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
  }
  &::placeholder { color: #475569; }
`;

const ErrorMsg = styled(motion.span)`
  display: block;
  color: #EF4444;
  font-size: 12px;
  margin-top: 6px;
`;

const GlobalError = styled(motion.div)`
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: 10px;
  padding: 12px 16px;
  color: #EF4444;
  font-size: 13px;
  margin-bottom: 20px;
  text-align: center;
`;

const SubmitButton = styled(Button)`
  width: 100%;
  margin-top: 8px;
  height: 48px;
  font-size: 15px;
`;

const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: `${Math.random() * 100}%`,
  y: `${Math.random() * 100}%`,
  delay: `${Math.random() * 5}s`,
  size: `${3 + Math.random() * 4}px`,
}));

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [globalError, setGlobalError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setGlobalError('');
    try {
      const res = await authApi.login(data.username, data.password);
      const token = res.data.access_token;
      localStorage.setItem('access_token', token);
      const meRes = await authApi.me();
      setAuth(meRes.data, token);
      navigate('/map');
    } catch {
      setGlobalError('Неверный логин или пароль');
    }
  };

  return (
    <Page>
      <Grid />
      <BgOrb $x="-10%" $y="-20%" $size="600px" $color="rgba(37,99,235,0.12)" $delay="0s" />
      <BgOrb $x="60%" $y="50%" $size="500px" $color="rgba(139,92,246,0.08)" $delay="2s" />
      <BgOrb $x="20%" $y="70%" $size="400px" $color="rgba(34,197,94,0.06)" $delay="4s" />
      {PARTICLES.map((p) => (
        <Particle key={p.id} $x={p.x} $y={p.y} $delay={p.delay} $size={p.size} />
      ))}

      <FormCard
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24, delay: 0.1 }}
      >
        <Logo>
          <LogoIcon
            initial={{ rotateY: -90 }}
            animate={{ rotateY: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.3 }}
          >
            🗺️
          </LogoIcon>
          <div style={{ textAlign: 'center' }}>
            <Title>eMedosmotr Map</Title>
            <Subtitle>Система мониторинга внедрения</Subtitle>
          </div>
        </Logo>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <AnimatePresence>
            {globalError && (
              <GlobalError
                key="err"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {globalError}
              </GlobalError>
            )}
          </AnimatePresence>

          <Field>
            <Label htmlFor="username">Логин</Label>
            <Input
              id="username"
              type="text"
              placeholder="Введите имя пользователя"
              $error={!!errors.username}
              {...register('username')}
              whileFocus={{ scale: 1.005 }}
            />
            <AnimatePresence>
              {errors.username && (
                <ErrorMsg
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {errors.username.message}
                </ErrorMsg>
              )}
            </AnimatePresence>
          </Field>

          <Field>
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              $error={!!errors.password}
              {...register('password')}
              whileFocus={{ scale: 1.005 }}
            />
            <AnimatePresence>
              {errors.password && (
                <ErrorMsg
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {errors.password.message}
                </ErrorMsg>
              )}
            </AnimatePresence>
          </Field>

          <SubmitButton type="submit" loading={isSubmitting} size="lg">
            {isSubmitting ? 'Вход...' : 'Войти в систему'}
          </SubmitButton>
        </form>
      </FormCard>
    </Page>
  );
}
