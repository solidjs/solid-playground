import { Accessor, createContext, createResource, createSignal, ParentComponent, Resource, useContext } from 'solid-js';
import type { Tab } from '../src';

interface AppContextType {
  token: string;
  user: Resource<{ display: string; avatar: string } | undefined>;
  tabs: Accessor<Tab[] | undefined>;
  setTabs: (x: Accessor<Tab[] | undefined>) => void;
}

const AppContext = createContext<AppContextType>();

// export const API = 'http://localhost:8787';
// export const API = '/api';
export const API = 'https://api.solidjs.com';

export const AppContextProvider: ParentComponent = (props) => {
  let token = localStorage.getItem('token') || '';
  const [user] = createResource(token, async (token) => {
    if (!token)
      return {
        display: '',
        avatar: '',
      };
    const result = await fetch(`${API}/profile`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    const body = await result.json();
    return {
      display: body.display,
      avatar: body.avatar,
    };
  });

  let [hasTabs, setHasTabs] = createSignal(false);
  let tabs: Accessor<Tab[] | undefined>;
  return (
    <AppContext.Provider
      value={{
        get token() {
          return token;
        },
        set token(x) {
          token = x;
          localStorage.setItem('token', x);
        },
        user,
        tabs() {
          if (!hasTabs()) return undefined;
          return tabs();
        },
        setTabs(x) {
          tabs = x;
          setHasTabs(true);
        },
      }}
    >
      {props.children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
