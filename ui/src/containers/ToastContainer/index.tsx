import { ToastOptions } from "@ionic/core";
import { IonToast } from "@ionic/react";
import React, { useEffect, useState } from "react";
import { ToastContext } from "./context";

const ToastContainer: React.FC = ({ children }) => {
  const [isShowing, setIsShowing] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [props, setProps] = useState({});
  const showToast = (props: ToastOptions) => {
    setProps(props);
    setShouldShow(true);
  };

  useEffect(() => {
    setIsShowing(shouldShow);
  }, [shouldShow]);

  const dismissToast = () => {
    setShouldShow(false);
    setIsShowing(false);
  };

  useEffect(() => {
    if (!shouldShow) setProps({});
  }, [shouldShow]);

  const showErrorToast = (props: ToastOptions) => {
    setProps({ color: "danger", ...props });
    setShouldShow(true);
  };

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, showErrorToast }}>
      <IonToast
        isOpen={isShowing}
        onDidDismiss={dismissToast}
        duration={1500}
        {...props}
      />

      {children}
    </ToastContext.Provider>
  );
};

export default ToastContainer;
