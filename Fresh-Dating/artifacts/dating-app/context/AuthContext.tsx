import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

export type UserProfile = {
  userId: string;
  displayName: string;
  bio?: string;
  age?: number;
  genderIdentity: string;
  orientation: string;
  relationshipIntent: string;
  verificationStatus: "unverified" | "pending" | "verified";
  freshnessScore: number;
  freshnessLabel?: string;
  profileCompletenessScore: number;
  premiumTier: "free" | "premium";
  lastActiveAt?: string;
  locationCity?: string;
  distanceKm?: number;
  photos: {
    photoId: string;
    url: string;
    isPrimary: boolean;
    freshnessLabel?: string;
    uploadedAt?: string;
  }[];
  prompts: {
    promptAnswerId: string;
    promptText: string;
    answerType: string;
    contentText?: string;
    updatedAt?: string;
  }[];
  nowItems: {
    nowItemId: string;
    mediaType: string;
    caption?: string;
    url?: string;
    createdAt: string;
    expiresAt?: string;
  }[];
};

type AuthContextType = {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  apiUrl: string;
};

export type SignupData = {
  email: string;
  password: string;
  displayName: string;
  dateOfBirth: string;
  genderIdentity: string;
  orientation: string;
  relationshipIntent: string;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedToken = await AsyncStorage.getItem("auth_token");
      const storedUser = await AsyncStorage.getItem("auth_user");
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
      setIsLoading(false);
    })();
  }, []);

  const apiCall = async (path: string, options: RequestInit = {}) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || "Request failed");
    return data;
  };

  const login = async (email: string, password: string) => {
    const data = await apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await AsyncStorage.setItem("auth_token", data.token);
    await AsyncStorage.setItem("auth_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const signup = async (signupData: SignupData) => {
    const data = await apiCall("/auth/signup", {
      method: "POST",
      body: JSON.stringify(signupData),
    });
    await AsyncStorage.setItem("auth_token", data.token);
    await AsyncStorage.setItem("auth_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("auth_token");
    await AsyncStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const data = await apiCall("/auth/me");
      await AsyncStorage.setItem("auth_user", JSON.stringify(data));
      setUser(data);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, signup, logout, refreshUser, apiUrl: BASE_URL }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
