/*
<ai_context>
This client component provides the sidebar for the app.
</ai_context>
*/

"use client"

import {
  BarChart3,
  BookOpen,
  Brain,
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  Library,
  Rocket,
  Settings2,
  Sparkles
} from "lucide-react"
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
        { title: "Overview", url: "/dashboard" },
        { title: "Recent Activity", url: "/dashboard/activity" },
        { title: "Statistics", url: "/dashboard/stats" }
      ]
    },
    {
      title: "Generate Quiz",
      url: "/generate",
      icon: Sparkles,
      items: [
        { title: "From Text", url: "/generate/text" },
        { title: "From Topic", url: "/generate/topic" },
        { title: "From URL", url: "/generate/url" },
        { title: "Custom Prompt", url: "/generate/custom" }
      ]
    },
    {
      title: "My Quizzes",
      url: "/quizzes",
      icon: FileText,
      items: [
        { title: "All Quizzes", url: "/quizzes" },
        { title: "Drafts", url: "/quizzes/drafts" },
        { title: "Published", url: "/quizzes/published" },
        { title: "Archived", url: "/quizzes/archived" }
      ]
    },
    {
      title: "Question Bank",
      url: "/questions",
      icon: Library,
      items: [
        { title: "All Questions", url: "/questions" },
        { title: "Favorites", url: "/questions/favorites" },
        { title: "By Subject", url: "/questions/subjects" }
      ]
    },
    {
      title: "Quiz History",
      url: "/history",
      icon: History,
      items: [
        { title: "Attempts", url: "/history/attempts" },
        { title: "Results", url: "/history/results" }
      ]
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: BarChart3,
      items: [
        { title: "Performance", url: "/analytics/performance" },
        { title: "Insights", url: "/analytics/insights" }
      ]
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
      items: [
        { title: "General", url: "/settings" },
        { title: "AI Models", url: "/settings/models" },
        { title: "Preferences", url: "/settings/preferences" },
        { title: "Billing", url: "/settings/billing" }
      ]
    }
  ],
  projects: [
    { name: "Mathematics", url: "/subjects/math", icon: Brain },
    { name: "Science", url: "/subjects/science", icon: BookOpen },
    { name: "History", url: "/subjects/history", icon: FolderOpen }
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
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
