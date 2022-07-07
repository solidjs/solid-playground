import { Navigate, useSearchParams } from 'solid-app-router';
import { useAppContext } from '../context';

export const Login = () => {
  const [params] = useSearchParams();
  const context = useAppContext()!;
  context.token = params.token;
  return <Navigate href="/" />;
};
