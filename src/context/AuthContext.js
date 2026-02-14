import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import employeeManager from "../utils/EmployeeManager";
import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { getEmployeeMembership } from "../auth";

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

        const stored = employeeManager.getEmployee();
        const businessId = stored?.business_id;
        if (!businessId) {
          if (isMounted) setEmployee(null);
          return;
        }

        const profile = await getEmployeeMembership({ authUid: sessionUser.id, businessId });
        if (isMounted) {
          if (profile?.error) setEmployee(null);
          else setEmployee(profile.data);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFromSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const sessionUser = session?.user;
        if (!sessionUser?.id) {
          setEmployee(null);
          return;
        }
        const stored = employeeManager.getEmployee();
        const businessId = stored?.business_id;
        if (!businessId) {
          setEmployee(null);
          return;
        }

        const profile = await getEmployeeMembership({ authUid: sessionUser.id, businessId });
        if (profile?.error) setEmployee(null);
        else setEmployee(profile.data);
      } catch (err) {
        // Avoid unhandled promise rejections causing the red error overlay.
        setEmployee(null);
      }
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
