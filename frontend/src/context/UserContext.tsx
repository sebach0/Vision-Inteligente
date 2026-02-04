import React, { createContext, useState, useContext, useEffect } from "react";
import { useAuth } from "./AuthContext";

// Definición del tipo User con información más completa
export type User = {
  id?: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  telefono?: string;
  rol?: {
    id: number;
    nombre: string;
    es_administrativo: boolean;
  };
};

// Creación del contexto con su tipo correspondiente
interface UserContextType {
  user: User | null;
  updateUserInfo: (newData: Partial<User>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Provider que encapsula la lógica del usuario
export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser, isAuthenticated } = useAuth();
  const [user, setUser] = useState<User | null>(null);

  // Sincronizar con el usuario de AuthContext
  useEffect(() => {
    if (isAuthenticated && authUser) {
      setUser(authUser);
    } else {
      setUser(null);
    }
  }, [authUser, isAuthenticated]);

  // Función para actualizar datos del usuario
  const updateUserInfo = (newData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...newData });
    }
  };

  const contextValue: UserContextType = {
    user,
    updateUserInfo
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

// Hook para facilitar el uso del contexto
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser debe ser usado dentro de un UserProvider");
  }
  return context;
}
