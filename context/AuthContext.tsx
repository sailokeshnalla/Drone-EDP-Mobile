import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

/* ---------------- TYPES ---------------- */

type LoggedUser = {
  id: string;
  name: string;
  phone: string;
};

type AuthContextType = {
  user: LoggedUser | null;
  setUser: React.Dispatch<React.SetStateAction<LoggedUser | null>>;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  loginByUserId: (userId: string) => Promise<boolean>;
};

/* ---------------- CONTEXT ---------------- */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ---------------- PROVIDER ---------------- */

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<LoggedUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    checkLoggedUser();
  }, []);

  const clearStoredUser = async () => {
    try {
      await AsyncStorage.multiRemove(["user_id", "user_name", "user_phone"]);
    } catch (err) {
      console.log("Error clearing stored user:", err);
    } finally {
      setUser(null);
    }
  };

  const fetchUserFromDb = async (
    userId: string
  ): Promise<LoggedUser | null> => {
    try {
      const { data, error } = await supabase
        .from("farmers")
        .select("id, full_name, phone_number")
        .eq("id", userId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        name: data.full_name || "",
        phone: data.phone_number || "",
      };
    } catch (err) {
      console.log("Error fetching user from DB:", err);
      return null;
    }
  };

  const checkLoggedUser = async () => {
    try {
      setLoading(true);

      const userId = await AsyncStorage.getItem("user_id");

      if (!userId) {
        await clearStoredUser();
        return;
      }

      const loggedUser = await fetchUserFromDb(userId);

      if (!loggedUser) {
        await clearStoredUser();
        return;
      }

      setUser(loggedUser);

      await AsyncStorage.multiSet([
        ["user_id", loggedUser.id],
        ["user_name", loggedUser.name],
        ["user_phone", loggedUser.phone],
      ]);
    } catch (err) {
      console.log("Error checking logged user:", err);
      await clearStoredUser();
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    await checkLoggedUser();
  };

  const loginByUserId = async (userId: string): Promise<boolean> => {
    try {
      setLoading(true);

      const loggedUser = await fetchUserFromDb(userId);

      if (!loggedUser) {
        await clearStoredUser();
        return false;
      }

      await AsyncStorage.multiSet([
        ["user_id", loggedUser.id],
        ["user_name", loggedUser.name],
        ["user_phone", loggedUser.phone],
      ]);

      setUser(loggedUser);
      return true;
    } catch (err) {
      console.log("Login error:", err);
      await clearStoredUser();
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await clearStoredUser();
    } catch (err) {
      console.log("Logout error:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        logout,
        refreshUser,
        loginByUserId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* ---------------- HOOK ---------------- */

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};