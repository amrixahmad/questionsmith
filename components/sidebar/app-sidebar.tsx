/*
<ai_context>
This client component provides the sidebar for the app.
</ai_context>
*/

"use client"

import { FileText, LayoutDashboard, Rocket, Sparkles } from "lucide-react"
import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail
} from "@/components/ui/sidebar"
import { NavMain } from "./nav-main"
import { NavProjects } from "./nav-projects"
import { NavUser } from "./nav-user"
import { TeamSwitcher } from "./team-switcher"

// Quiz app data
const data = {
  user: {
    name: "Question Smith",
    email: "user@example.com",
    avatar: "/avatars/user.jpg"
  },
  teams: [
    {
      name: "Question Smith",
      logo: Rocket,
      plan: "Free"
    }
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
      items: [
        { title: "Overview", url: "/dashboard" }
        // { title: "Recent Quizzes", url: "/dashboard/recent" },
        // { title: "Statistics", url: "/dashboard/statistics" }
      ]
    },
    {
      title: "Generate Quiz",
      url: "/generate",
      icon: Sparkles,
      items: [
        { title: "From Text", url: "/generate/text" }
        // { title: "From Topic", url: "/generate/topic" },
        // { title: "From URL", url: "/generate/url" },
        // { title: "Custom Prompt", url: "/generate/custom" }
      ]
    },
    {
      title: "My Quizzes",
      url: "/quizzes",
      icon: FileText,
      items: [
        { title: "All Quizzes", url: "/quizzes" }
        // { title: "Drafts", url: "/quizzes/drafts" },
        // { title: "Published", url: "/quizzes/published" }
      ]
    }
    // ,
    // {
    //   title: "Quiz History",
    //   url: "/history",
    //   icon: History,
    //   items: [
    //     { title: "Past Attempts", url: "/history/attempts" },
    //     { title: "Results", url: "/history/results" }
    //   ]
    // },
    // {
    //   title: "Question Bank",
    //   url: "/questions",
    //   icon: Library,
    //   items: [
    //     { title: "All Questions", url: "/questions" },
    //     { title: "Saved Questions", url: "/questions/saved" },
    //     { title: "Favorites", url: "/questions/favorites" }
    //   ]
    // },
    // {
    //   title: "Templates",
    //   url: "/templates",
    //   icon: BookOpen,
    //   items: [
    //     { title: "Multiple Choice", url: "/templates/multiple-choice" },
    //     { title: "True/False", url: "/templates/true-false" },
    //     { title: "Short Answer", url: "/templates/short-answer" },
    //     { title: "Fill in the Blank", url: "/templates/fill-blank" }
    //   ]
    // },
    // {
    //   title: "Settings",
    //   url: "/settings",
    //   icon: Settings2,
    //   items: [
    //     { title: "Quiz Preferences", url: "/settings/preferences" },
    //     { title: "AI Model Settings", url: "/settings/ai-models" },
    //     { title: "API Keys", url: "/settings/api-keys" }
    //   ]
    // },
    // {
    //   title: "Analytics",
    //   url: "/analytics",
    //   icon: BarChart3,
    //   items: [
    //     { title: "Performance Metrics", url: "/analytics/performance" },
    //     { title: "Insights", url: "/analytics/insights" }
    //   ]
    // }
  ],
  projects: [
    // { name: "Mathematics", url: "/subjects/mathematics", icon: Brain },
    // { name: "Science", url: "/subjects/science", icon: BookOpen },
    // { name: "History", url: "/subjects/history", icon: FolderOpen },
    // { name: "Share Quizzes", url: "/share", icon: FileText },
    // { name: "Import/Export", url: "/import-export", icon: FolderOpen }
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
