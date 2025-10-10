/*
<ai_context>
Contains deprecated server actions related to todos. This app has phased out the template todo feature.
</ai_context>
*/

"use server"

// Keep ActionState type for compatibility
import { ActionState } from "@/types"

export interface DeprecatedTodo {
  id: string
  userId: string
  content: string
  completed: boolean
  createdAt: Date
  updatedAt: Date
}

const deprecatedMessage =
  "The Todo feature has been removed from this app. Consider using Quizzes or Questions flows instead."

export async function createTodoAction(): Promise<ActionState<DeprecatedTodo>> {
  return { isSuccess: false, message: deprecatedMessage }
}

export async function getTodosAction(): Promise<ActionState<DeprecatedTodo[]>> {
  return { isSuccess: false, message: deprecatedMessage }
}

export async function updateTodoAction(): Promise<ActionState<DeprecatedTodo>> {
  return { isSuccess: false, message: deprecatedMessage }
}

export async function deleteTodoAction(): Promise<ActionState<void>> {
  return { isSuccess: false, message: deprecatedMessage }
}

export async function deleteTodosByUserIdAction(): Promise<ActionState<void>> {
  return { isSuccess: false, message: deprecatedMessage }
}
