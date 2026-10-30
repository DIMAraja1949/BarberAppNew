import { createContext, useContext } from "react";

type GuestModeContextValue = {
  guestMode: boolean;
  setGuestMode: (enabled: boolean) => void;
};

export const GuestModeContext = createContext<GuestModeContextValue>({
  guestMode: false,
  setGuestMode: () => {},
});

export const useGuestMode = () => useContext(GuestModeContext);
