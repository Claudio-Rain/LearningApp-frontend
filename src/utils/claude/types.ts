/** One turn of a chat with the assistant. */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** A question/answer pair produced when splitting one flashcard into several. */
export interface SplitProposal {
  question: string
  answer: string
}
