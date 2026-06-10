'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { PROJECTS } from '@/lib/projects'

interface Project {
  id: string
  name: string
}

interface ProjectContextType {
  currentProject: Project | null
  projects: Project[]
  setProject: (project: Project | null) => void
  loading: boolean
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [loading] = useState(false)

  // Source de vérité unique : le registre de projets
  const projects: Project[] = PROJECTS.map((p) => ({ id: p.id, name: p.name }))

  return (
    <ProjectContext.Provider value={{ 
      currentProject, 
      projects, 
      setProject: setCurrentProject,
      loading 
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}