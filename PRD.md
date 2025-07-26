# English Conversation Study App PRD

An interactive English conversation practice application that helps Japanese speakers improve their English through AI-powered chat conversations with real-time Japanese explanations.

**Experience Qualities**: 
1. Encouraging - Creates a supportive environment that builds confidence through positive reinforcement
2. Educational - Provides clear learning context with immediate Japanese explanations of English usage
3. Intuitive - Seamless voice and text input options that feel natural and responsive

**Complexity Level**: Light Application (multiple features with basic state)
The app focuses on conversational practice with AI assistance, managing chat history and providing bilingual support without requiring complex user accounts or advanced features.

## Essential Features

### AI English Conversation Chat
- **Functionality**: Real-time English conversation with AI tutor that responds naturally and appropriately to user's English level
- **Purpose**: Provides safe practice environment for English conversation without judgment
- **Trigger**: User types or speaks English message
- **Progression**: User input → AI processes message → Conversational English response → Japanese explanation appears in sidebar
- **Success criteria**: User can maintain flowing English conversation with helpful context

### Voice Input Support
- **Functionality**: Speech-to-text conversion for English input with microphone button
- **Purpose**: Practices pronunciation and speaking skills, not just writing
- **Trigger**: User clicks microphone button and speaks
- **Progression**: Mic button pressed → Recording starts → User speaks → Speech converted to text → Sent as message
- **Success criteria**: Accurate speech recognition that encourages verbal practice

### Real-time Japanese Explanations
- **Functionality**: Automatic translation and explanation of English usage in Japanese
- **Purpose**: Helps users understand nuances, grammar, and cultural context of their English usage
- **Trigger**: When conversation begins or new English phrases are used
- **Progression**: English conversation occurs → AI analyzes language patterns → Japanese explanations appear in dedicated panel
- **Success criteria**: Clear, helpful explanations that enhance understanding without interrupting flow

### Conversation History
- **Functionality**: Persistent storage of chat conversations for review
- **Purpose**: Allows users to track progress and revisit learning moments
- **Trigger**: Automatic saving as conversation progresses
- **Progression**: Messages exchanged → Automatically saved → Available for review in future sessions
- **Success criteria**: Conversations persist between sessions and can be easily accessed

## Edge Case Handling
- **Empty Input**: Gentle prompts encouraging user to try speaking or typing in English
- **Non-English Input**: Polite redirection to use English for practice, with Japanese explanation
- **Speech Recognition Errors**: Clear retry options with both voice and text input alternatives
- **Long Conversations**: Smooth scrolling and navigation through extended chat history
- **Network Issues**: Graceful handling with offline indicators and retry mechanisms

## Design Direction
The design should feel encouraging and educational like a friendly tutor - clean, modern interface with soft colors that create a welcoming learning environment rather than intimidating academic atmosphere. Minimal interface that keeps focus on conversation flow while providing easy access to learning tools.

## Color Selection
Analogous color scheme using blues and teals to create a calming, trustworthy learning environment that reduces anxiety around language practice.

- **Primary Color**: Soft Blue (#0ea5e9 / oklch(0.65 0.15 220)) - Communicates trust and calm learning
- **Secondary Colors**: Light Blue backgrounds (#f0f9ff / oklch(0.98 0.02 220)) for chat areas and Teal accents (#14b8a6 / oklch(0.7 0.12 180)) for interactive elements
- **Accent Color**: Vibrant Teal (#06b6d4 / oklch(0.68 0.13 190)) for call-to-action buttons like microphone and send
- **Foreground/Background Pairings**: 
  - Background (Light Blue #f0f9ff): Dark Gray text (#1f2937) - Ratio 12.1:1 ✓
  - Primary (Soft Blue #0ea5e9): White text (#ffffff) - Ratio 4.9:1 ✓
  - Secondary (Light Blue #f0f9ff): Dark Blue text (#1e40af) - Ratio 8.2:1 ✓
  - Accent (Vibrant Teal #06b6d4): White text (#ffffff) - Ratio 5.1:1 ✓

## Font Selection
Typography should feel approachable and readable, supporting both English and Japanese text clearly with fonts that work well for language learning applications.

- **Typographic Hierarchy**: 
  - H1 (App Title): Inter Bold/32px/tight letter spacing
  - H2 (Section Headers): Inter Semibold/24px/normal spacing  
  - Body (Chat Messages): Inter Regular/16px/relaxed line height for readability
  - Small (Explanations): Inter Regular/14px/normal spacing for Japanese explanations

## Animations
Subtle and supportive animations that enhance the learning experience without distraction - gentle transitions that guide attention to new explanations and smooth message appearances that feel conversational.

- **Purposeful Meaning**: Gentle animations communicate encouragement and progress, with smooth transitions that maintain learning flow
- **Hierarchy of Movement**: Message sending gets subtle confirmation animation, new explanations fade in gently, microphone pulses during recording

## Component Selection
- **Components**: Card components for chat areas, Button for microphone and send actions, Input for text entry, ScrollArea for chat history, Separator for dividing chat and explanations panel
- **Customizations**: Custom message bubbles with directional styling, custom microphone button with recording states, specialized explanation cards
- **States**: Microphone button (idle/recording/processing), send button (enabled/disabled), input field (focused/typing), explanation cards (new/viewed)
- **Icon Selection**: Microphone for voice input, Send arrow for message sending, Volume for audio playback, Info for explanations
- **Spacing**: Consistent 4-unit spacing (16px) between major elements, 2-unit (8px) for related items, 6-unit (24px) for section separation
- **Mobile**: Single column layout with collapsible explanation panel, larger touch targets for voice input, optimized text sizes for mobile reading