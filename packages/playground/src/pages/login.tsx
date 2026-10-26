import { onSettled } from 'solid-js';
import { useNavigate, useSearchParams } from '@solidjs/router';
import { useAppContext } from '../context';

export const Login = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const context = useAppContext();
  onSettled(() => {
    context.token = String(params.token ?? '');
    navigate('/', { replace: true });
  });
  return null;
};
