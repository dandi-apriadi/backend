import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logoutUser, reset } from "../../store/slices/authSlice";

export default function Logout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isSuccess, isError, message } = useSelector((state) => state.auth);

  useEffect(() => {
    // Dispatch the logout action
    dispatch(logoutUser());

    // Navigate to the login page on successful logout
    if (isSuccess) {
      dispatch(reset());
      navigate("/auth/sign-in");
    }

    // Reset the state
  }, [dispatch, isSuccess, navigate]);

  return (
    <div className="mt-16 flex h-full w-full items-center justify-center">
      <div className="text-center">
        {isError ? (
          <p className="text-red-500">{message}</p>
        ) : (
          <p className="text-navy-700 dark:text-white">Logging out...</p>
        )}
      </div>
    </div>
  );
}
