import { useState } from 'react';
import {
  CognitoUserPool,
  CognitoUserAttribute,
  CognitoUser,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js';
import { POOL_DATA } from '../utils';

const userPool = new CognitoUserPool(POOL_DATA);

const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userSession, setUserSession] = useState(null);
  const [registeredUser, setRegisteredUser] = useState(null);

  const signUp = (fullName, userName, email, password) => {
    const attrList = [];
    const emailAttribute = {
      Name: 'email',
      Value: email,
    };
    const fullNameAttribute = {
      Name: 'name',
      Value: fullName,
    };
    attrList.push(new CognitoUserAttribute(emailAttribute));
    attrList.push(new CognitoUserAttribute(fullNameAttribute));

    setLoading(true);
    console.log(password);
    userPool.signUp(userName, password, attrList, null, (err, result) => {
      setLoading(false);
      if (err) {
        setError(err.message);
        return;
      }
      setRegisteredUser(result.user);
      setError(null);
    });
  };

  const confirmUser = (userName, code) => {
    setLoading(true);
    const userData = {
      Username: userName,
      Pool: userPool,
    };
    const cognitouser = new CognitoUser(userData);
    cognitouser.confirmRegistration(code, true, (err, result) => {
      setLoading(false);
      if (err) {
        setError(err.message);
      }
      setError(null);
      console.log(result);
      window.location.href = '/';
    });
  };

  const signIn = (username, password) => {
    const authData = {
      Username: username,
      Password: password,
    };
    const authDetails = new AuthenticationDetails(authData);
    const userData = {
      Username: username,
      Pool: userPool,
    };
    const cognitoUser = new CognitoUser(userData);
    setLoading(true);
    cognitoUser.authenticateUser(authDetails, {
      onSuccess(result) {
        setError(null);
        setLoading(false);
        setUserSession(result);
        window.location.href = '/documents';
      },
      onFailure(err) {
        setError(err.message);
        setLoading(false);
        console.log(err);
      },
    });
  };

  const getAuthenticatedUser = () => {
    return userPool.getCurrentUser();
  };

  const logout = () => {
    getAuthenticatedUser().signOut();
    setUserSession(null);
    setRegisteredUser(null);
    window.location.href = '/';
  };

  const isAuthenticated = () => {
    const user = getAuthenticatedUser();
    let isAuthenticated = false;
    if (user) {
      user.getSession((err, session) => {
        if (!err && session.isValid()) {
          isAuthenticated = true;
        }
      });
    }
    return isAuthenticated;
  };

  return {
    error,
    loading,
    userSession,
    registeredUser,
    signIn,
    signUp,
    confirmUser,
    getAuthenticatedUser,
    logout,
    isAuthenticated,
  };
};

export default useAuth;