import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from "react";
import {
  type User,
  clientAuthService,
  adminAuthService,
  tokenUtils,
  ApiError,
} from "@/services/api";

// Tipos para el contexto
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  // Funciones para clientes
  login: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<void>;
  loginWithGoogle: (googleData: {
    username: string;
    password: string;
    isGoogleAuth: boolean;
    googleToken: string;
  }) => Promise<void>;
  register: (userData: {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    password1: string;
    password2: string;
    telefono?: string;
  }) => Promise<void>;
  logout: () => void;

  // Funciones para administradores
  adminLogin: (username: string, password: string) => Promise<void>;
  adminLogout: () => void;

  // Funciones generales
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

// Estado inicial
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isAdmin: false,
  error: null,
};

// Tipos de acciones
type AuthAction =
  | { type: "AUTH_START" }
  | { type: "AUTH_SUCCESS"; payload: { user: User; isAdmin: boolean } }
  | { type: "AUTH_FAILURE"; payload: string }
  | { type: "AUTH_LOGOUT" }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_LOADING"; payload: boolean };

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "AUTH_START":
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case "AUTH_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isAdmin: action.payload.isAdmin,
        isLoading: false,
        error: null,
      };
    case "AUTH_FAILURE":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isAdmin: false,
        isLoading: false,
        error: action.payload,
      };
    case "AUTH_LOGOUT":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isAdmin: false,
        isLoading: false,
        error: null,
      };
    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
}

// Crear contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
}

// Provider del contexto
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Verificar autenticación al cargar la app
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = tokenUtils.getAccessToken();
    const user = tokenUtils.getStoredUser();

    if (!token || !user) {
      dispatch({ type: "SET_LOADING", payload: false });
      return;
    }

    // Verificar si el token está expirado
    if (tokenUtils.isTokenExpired(token)) {
      const refreshToken = tokenUtils.getRefreshToken();
      if (refreshToken) {
        try {
          await refreshAuthToken();
        } catch {
          tokenUtils.clearTokens();
          dispatch({ type: "SET_LOADING", payload: false });
        }
      } else {
        tokenUtils.clearTokens();
        dispatch({ type: "SET_LOADING", payload: false });
      }
      return;
    }

    // Usuario autenticado
    dispatch({
      type: "AUTH_SUCCESS",
      payload: {
        user,
        isAdmin: user.rol?.es_administrativo || false,
      },
    });
  };

  const refreshAuthToken = async () => {
    const refreshToken = tokenUtils.getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token available");

    try {
      const response = await adminAuthService.refreshToken(refreshToken);
      if (response.success && response.data) {
        const newTokens = {
          access: response.data.access,
          refresh: refreshToken,
        };
        tokenUtils.saveTokens(newTokens);
      }
    } catch (error) {
      throw error;
    }
  };

  // Login para clientes
  const login = async (email: string, password: string, rememberMe = false) => {
    dispatch({ type: "AUTH_START" });

    try {
      const response = await clientAuthService.login({
        email,
        password,
        rememberMe,
      });

      if (response.success && response.data) {
        // Guardar tokens
        tokenUtils.saveTokens(response.data);

        // Obtener perfil del usuario
        const profileResponse = await clientAuthService.getProfile();

        if (profileResponse.success && profileResponse.data) {
          const user = profileResponse.data;
          tokenUtils.saveTokens({ ...response.data, user });

          dispatch({
            type: "AUTH_SUCCESS",
            payload: {
              user,
              isAdmin: false,
            },
          });
        } else {
          throw new Error("Error al obtener perfil del usuario");
        }
      } else {
        throw new Error(response.error || "Error en el login");
      }
    } catch (error) {
      const errorMessage =
        error instanceof ApiError ? error.message : "Error de conexión";
      dispatch({ type: "AUTH_FAILURE", payload: errorMessage });
      throw error;
    }
  };

  // Login con Google para clientes
  const loginWithGoogle = async (googleData: {
    username: string;
    password: string;
    isGoogleAuth: boolean;
    googleToken: string;
  }) => {
    dispatch({ type: "AUTH_START" });

    try {
      // Enviar el token de Google al backend
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/google/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            access_token: googleData.googleToken,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Error en la autenticación con Google");
      }

      const data = await response.json();

      if (data.access && data.refresh) {
        // Guardar tokens
        tokenUtils.saveTokens({
          access: data.access,
          refresh: data.refresh,
        });

        // Obtener perfil del usuario
        const profileResponse = await clientAuthService.getProfile();

        if (profileResponse.success && profileResponse.data) {
          const user = profileResponse.data;
          tokenUtils.saveTokens({
            access: data.access,
            refresh: data.refresh,
            user,
          });

          dispatch({
            type: "AUTH_SUCCESS",
            payload: {
              user,
              isAdmin: false,
            },
          });
        } else {
          throw new Error("Error al obtener perfil del usuario");
        }
      } else {
        throw new Error("Error en la respuesta de Google OAuth");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error de conexión con Google";
      dispatch({ type: "AUTH_FAILURE", payload: errorMessage });
      throw error;
    }
  };

  // Registro para clientes
  const register = async (userData: {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    password1: string;
    password2: string;
    telefono?: string;
  }) => {
    dispatch({ type: "AUTH_START" });

    try {
      const response = await clientAuthService.register(userData);

      if (response.success) {
        // No hacer login automático, el usuario debe verificar su email
        dispatch({ type: "AUTH_LOGOUT" });
      } else {
        throw new Error(response.error || "Error en el registro");
      }
    } catch (error) {
      const errorMessage =
        error instanceof ApiError ? error.message : "Error de conexión";
      dispatch({ type: "AUTH_FAILURE", payload: errorMessage });
      throw error;
    }
  };

  // Login para administradores
  const adminLogin = async (username: string, password: string) => {
    dispatch({ type: "AUTH_START" });

    try {
      const response = await adminAuthService.login({ username, password });

      if (response.success && response.data) {
        // Guardar tokens y usuario
        tokenUtils.saveTokens(response.data);

        dispatch({
          type: "AUTH_SUCCESS",
          payload: {
            user: response.data.user,
            isAdmin: true,
          },
        });
      } else {
        throw new Error(response.error || "Error en el login de administrador");
      }
    } catch (error) {
      const errorMessage =
        error instanceof ApiError ? error.message : "Error de conexión";
      dispatch({ type: "AUTH_FAILURE", payload: errorMessage });
      throw error;
    }
  };

  // Logout para clientes
  const logout = async () => {
    try {
      await clientAuthService.logout();
    } catch (error) {
      console.error("Error en logout:", error);
    } finally {
      tokenUtils.clearTokens();
      dispatch({ type: "AUTH_LOGOUT" });
    }
  };

  // Logout para administradores
  const adminLogout = async () => {
    const refreshToken = tokenUtils.getRefreshToken();

    try {
      if (refreshToken) {
        await adminAuthService.logout(refreshToken);
      }
    } catch (error) {
      console.error("Error en logout de admin:", error);
      // Continuar con el logout local aunque falle el servidor
    } finally {
      tokenUtils.clearTokens();
      dispatch({ type: "AUTH_LOGOUT" });
    }
  };

  // Limpiar errores
  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  // Refrescar datos del usuario
  const refreshUser = async () => {
    if (!state.isAuthenticated) return;

    try {
      const response = state.isAdmin
        ? await adminAuthService.getProfile()
        : await clientAuthService.getProfile();

      if (response.success && response.data) {
        const user = response.data;
        tokenUtils.saveTokens({
          access: tokenUtils.getAccessToken()!,
          refresh: tokenUtils.getRefreshToken()!,
          user,
        });

        dispatch({
          type: "AUTH_SUCCESS",
          payload: {
            user,
            isAdmin: state.isAdmin,
          },
        });
      }
    } catch (error) {
      console.error("Error al refrescar usuario:", error);
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    loginWithGoogle,
    register,
    logout,
    adminLogin,
    adminLogout,
    clearError,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
