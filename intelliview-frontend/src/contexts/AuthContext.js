import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api, { API_BASE_URL } from '../config/api';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
    const isRefreshing = useRef(false);
    const userChecked = useRef(false);  // Track if we've already checked user status

    // For debugging
  useEffect(() => {
        console.log("AuthContext initialized with API_BASE_URL:", API_BASE_URL);
    }, []);

    // Memoized checkUser function to avoid recreating it on each render
    const checkUser = useCallback(async () => {
        // Skip if already refreshing or if we've already checked and loading is finished
        if (isRefreshing.current || (userChecked.current && !loading)) {
            console.log('Skipping duplicate user check');
            return;
        }
        
        try {
            isRefreshing.current = true;
            const token = localStorage.getItem('token');
            
            if (token) {
                console.log('Token found, fetching user data...');
                // Use full URL to avoid path issues
                const fullUrl = `${API_BASE_URL}/api/auth/user/`;
                console.log('Fetching user from:', fullUrl);
                
                const response = await api.get('/api/auth/user/');
                console.log('User data response:', response.data);
                setUser(response.data);
        } else {
                console.log('No token found in localStorage');
          setUser(null);
        }
            userChecked.current = true;  // Mark that we've checked the user
      } catch (error) {
            console.error('Error checking authentication status:', error.response?.data || error.message);
            console.error('Error details:', error);
            localStorage.removeItem('token'); // Clear invalid token
            setUser(null);
            userChecked.current = true;  // Mark that we've checked the user even on error
      } finally {
            isRefreshing.current = false;
        setLoading(false);
      }
    }, [loading]); // Only recreate if loading changes

    // Only run on initial mount - empty dependency array
    useEffect(() => {
        checkUser();
        // Clean up function
        return () => {
            userChecked.current = false;  // Reset for next mount
    };
    }, []); // Empty dependency array

    // Force refresh user data - with debounce protection
    const refreshUser = async () => {
        if (isRefreshing.current) {
            console.log('Already refreshing user, skipping...');
            return user;
      }

        setLoading(true);
        userChecked.current = false; // Force a refresh
        await checkUser();
        return user;
  };

    const signUp = async (data) => {
    try {
            const fullUrl = `${API_BASE_URL}/api/auth/register/`;
            console.log('Registering user at:', fullUrl);
      
            const response = await api.post('/api/auth/register/', {
                username: data.email,
                email: data.email,
                password: data.password,
                first_name: data.firstName,
                last_name: data.lastName
            });

            const { token, user } = response.data;
            localStorage.setItem('token', token);
            setUser(user);
            userChecked.current = true;  // Mark that user is verified
            return { user };
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const signIn = async (email, password) => {
    try {
            const fullUrl = `${API_BASE_URL}/api/auth/login/`;
            console.log('Logging in at:', fullUrl);
            
            const response = await api.post('/api/auth/login/', {
                email,
                password
            });

            const { token, user } = response.data;
            localStorage.setItem('token', token);
            setUser(user);
            userChecked.current = true;  // Mark that user is verified
            return { user };
    } catch (error) {
            console.error('Login error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
            await api.post('/api/auth/logout/');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
      setUser(null);
            userChecked.current = false;  // Reset for next login
        }
    };

    // Debug function to check auth status
    const checkAuthStatus = () => {
        const token = localStorage.getItem('token');
        console.log('Current auth status:', {
            hasToken: !!token, 
            token: token ? `${token.substring(0, 15)}...` : null,
            hasUser: !!user,
            userChecked: userChecked.current,
            isRefreshing: isRefreshing.current
        });
        return { hasToken: !!token, hasUser: !!user };
    };

    return (
        <AuthContext.Provider value={{
            user,
    signUp,
    signIn,
    signOut,
            loading,
            refreshUser,
            checkAuthStatus
        }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 