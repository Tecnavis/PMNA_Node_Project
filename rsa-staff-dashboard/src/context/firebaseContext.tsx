import React, { createContext, useState, ReactNode } from "react";

interface User {
  // Define the properties of the user object
}

interface AuthContextValue {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export const FirebaseContext = createContext(null);
export const AuthContext = createContext<null | AuthContextValue>(null);

interface ContextProps {
  children: ReactNode;
}

const Context: React.FC<ContextProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default Context;
