import { createContext, createResource, createSignal, ParentComponent, Resource, useContext } from 'solid-js';

interface AppContextType {
  token: string;
  user: Resource<{ display: any; avatar: any } | undefined>;
}

const AppContext = createContext<AppContextType>();

// const API = "http://localhost:8787";
export const API = 'https://api.solidjs.com';

export const AppContextProvider: ParentComponent = (props) => {
  const [token, setToken] = createSignal(localStorage.getItem('token') || '');
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
  return (
    <AppContext.Provider
      value={{
        get token() {
          return token();
        },
        set token(x) {
          setToken(x);
          localStorage.setItem('token', x);
        },
        user,
      }}
    >
      {props.children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
