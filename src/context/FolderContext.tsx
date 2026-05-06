import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FolderMetadata } from '../services/telegram';

interface FolderContextType {
  folders: FolderMetadata[];
  setFolders: React.Dispatch<React.SetStateAction<FolderMetadata[]>>;
  activeFolderId: number | null;
  setActiveFolderId: (id: number | null) => void;
}

const FolderContext = createContext<FolderContextType>({
  folders: [],
  setFolders: () => {},
  activeFolderId: null,
  setActiveFolderId: () => {},
});

export function FolderProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<FolderMetadata[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);

  return (
    <FolderContext.Provider value={{ folders, setFolders, activeFolderId, setActiveFolderId }}>
      {children}
    </FolderContext.Provider>
  );
}

export const useFolders = () => useContext(FolderContext);
