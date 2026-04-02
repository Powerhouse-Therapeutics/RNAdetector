import { createContext, useContext } from 'react';

export const DRAWER_WIDTH_EXPANDED = 240;
export const DRAWER_WIDTH_COLLAPSED = 64;

export interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
}

export const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => {},
});

export const useSidebarContext = () => useContext(SidebarContext);
