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

  const isMembershipMissingError = (err) => {
    const details = err?.details || "";
    const message = err?.message || "";
    const combined = `${message} ${details}`.trim();
    return /0 rows/i.test(combined) || /multiple \(or no\) rows/i.test(combined) || /PGRST116/i.test(combined);
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
          // User is authenticated but no stored employee yet (mid-login race).
          // Don't clear — let login.js finish setting the employee.
          // ✅ Must still resolve loading so the app doesn't spin forever.
          if (isMounted) setLoading(false);
          return;
        }

        const profile = await getEmployeeMembership({ authUid: sessionUser.id, businessId });
        if (isMounted) {
          if (profile?.error) {
            if (isMembershipMissingError(profile.error)) setEmployee(null);
            else console.warn("AuthContext: employee membership refresh failed (keeping current session)", profile.error);
          } else {
            setEmployee(profile.data);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFromSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        // Only act on SIGNED_OUT — all other events are handled by loadFromSession
        // or by login.js which calls setEmployee(result.user) directly.
        // Intercepting SIGNED_IN here causes a race that wipes the employee set by login.js.
        if (event === "SIGNED_OUT") {
          setEmployee(null);
        }
      } catch (err) {
        console.warn("AuthContext: auth state change handler error", err);
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
