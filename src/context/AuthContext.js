import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import employeeManager from "../utils/EmployeeManager";
import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { getEmployeeByAuthUid } from "../auth";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [employee, setEmployeeState] = useState(() => employeeManager.getEmployee());
  const [loading, setLoading] = useState(true);

  const setEmployee = (nextEmployee) => {
    setEmployeeState(nextEmployee);
    if (nextEmployee) employeeManager.setEmployee(nextEmployee);
    else employeeManager.clearEmployee();
  };

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadFromSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data?.session?.user;
        if (!sessionUser?.id) {
          if (isMounted) setEmployee(null);
          return;
        }

        const profile = await getEmployeeByAuthUid(sessionUser.id);
        if (isMounted) {
          if (profile.error) setEmployee(null);
          else setEmployee(profile.data);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFromSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user;
      if (!sessionUser?.id) {
        setEmployee(null);
        return;
      }
      const profile = await getEmployeeByAuthUid(sessionUser.id);
      if (profile.error) setEmployee(null);
      else setEmployee(profile.data);
    });

    return () => {
      isMounted = false;
      subscription?.subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo(
    () => ({
      employee,
      loading,
      setEmployee,
      clearEmployee: () => setEmployee(null),
    }),
    [employee, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
