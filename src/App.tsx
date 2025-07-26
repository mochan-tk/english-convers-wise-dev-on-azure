import { useState, useRef, useEffect } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Microphone, PaperPlaneTilt, Chat, SpeakerHigh, BookOpen, CloudLightning, X } from '@phosphor-icons/react'
import { toast, Toaster } from 'sonner'

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: number
  translation?: string
}

interface Explanation {
  id: string
  english: string
  japanese: string
  grammar?: string
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [explanations, setExplanations] = useState<Explanation[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [isExplanationOpen, setIsExplanationOpen] = useState(false)
  
  // Realtime API states
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isActivatingSession, setIsActivatingSession] = useState(false)
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null)
  const [events, setEvents] = useState<any[]>([])
  
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const audioElement = useRef<HTMLAudioElement | null>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (messages.length > 0) {
      setHasStarted(true)
    }
  }, [messages])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel) {
      // Append new server events to the list
      dataChannel.addEventListener('message', (e) => {
        const event = JSON.parse(e.data)
        if (!event.timestamp) {
          event.timestamp = new Date().toLocaleTimeString()
        }
        setEvents((prev) => [event, ...prev])

        // Handle different types of realtime events
        if (event.type === 'response.audio_transcript.done') {
          // AI's audio response transcript
          const transcript = event.transcript
          if (transcript && transcript.trim()) {
            const aiMessage: Message = {
              id: `ai-${Date.now()}`,
              text: transcript,
              isUser: false,
              timestamp: Date.now()
            }
            setMessages(prev => [...prev, aiMessage])
            
            // Generate explanation and translation for realtime response
            generateExplanationForMessage(transcript, 'リアルタイム音声会話')
            generateTranslationForMessage(aiMessage)
          }
        } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
          // User's audio input transcript
          const transcript = event.transcript
          if (transcript && transcript.trim()) {
            const userMessage: Message = {
              id: `user-${Date.now()}`,
              text: transcript,
              isUser: true,
              timestamp: Date.now()
            }
            setMessages(prev => [...prev, userMessage])
          }
        } else if (event.type === 'response.done' && event.response?.output) {
          // Fallback: Handle text-based responses
          event.response.output.forEach((output: any) => {
            if (output.type === 'message' && output.content) {
              const textContent = output.content
                .filter((c: any) => c.type === 'text')
                .map((c: any) => c.text)
                .join('')
              
              if (textContent && textContent.trim()) {
                const aiMessage: Message = {
                  id: `ai-text-${Date.now()}`,
                  text: textContent,
                  isUser: false,
                  timestamp: Date.now()
                }
                setMessages(prev => [...prev, aiMessage])
                
                // Generate explanation and translation for realtime response
                generateExplanationForMessage(textContent, 'リアルタイムテキスト会話')
                generateTranslationForMessage(aiMessage)
              }
            }
          })
        }
      })

      // Set session active when the data channel is opened
      dataChannel.addEventListener('open', () => {
        setIsSessionActive(true)
        setEvents([])
        setIsActivatingSession(false)
        toast.success('リアルタイムセッションが開始されました')
        
        // Configure session for audio transcription
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are a helpful English conversation tutor. Speak naturally and help the user practice English. Always respond in English.',
            voice: 'verse',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            }
          }
        }
        
        // Send session configuration
        if (dataChannel && dataChannel.readyState === 'open') {
          dataChannel.send(JSON.stringify(sessionConfig))
        }
      })

      dataChannel.addEventListener('close', () => {
        setIsSessionActive(false)
        toast.info('リアルタイムセッションが終了しました')
      })
    }
  }, [dataChannel])

  const initSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.lang = 'en-US'
      recognition.continuous = false
      recognition.interimResults = false

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setCurrentInput(transcript)
        setIsRecording(false)
      }

      recognition.onerror = () => {
        setIsRecording(false)
        toast.error('音声認識に失敗しました。もう一度お試しください。')
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      return recognition
    }
    return null
  }

  const startRecording = () => {
    const recognition = initSpeechRecognition()
    if (recognition) {
      recognitionRef.current = recognition
      setIsRecording(true)
      recognition.start()
    } else {
      toast.error('お使いのブラウザは音声認識に対応していません。')
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
  }

  const callChatAPI = async (userMessage: string) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userMessage
      }),
    })

    if (!response.ok) {
      throw new Error('Chat API call failed')
    }

    const data = await response.json()
    return data.content
  }

  const callExplanationAPI = async (userText: string, aiText: string) => {
    const response = await fetch('/api/explanation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userText,
        aiText
      }),
    })

    if (!response.ok) {
      throw new Error('Explanation API call failed')
    }

    const data = await response.json()
    return data.content
  }

  const callTranslateAPI = async (text: string) => {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text
      }),
    })

    if (!response.ok) {
      throw new Error('Translation API call failed')
    }

    const data = await response.json()
    return data.content
  }

  // Start realtime session
  const startRealtimeSession = async () => {
    if (isActivatingSession) return

    setIsActivatingSession(true)
    
    try {
      // Get a session token for OpenAI Realtime API
      const tokenResponse = await fetch('/api/token')
      const data = await tokenResponse.json()
      const EPHEMERAL_KEY = data.client_secret.value

      // Create a peer connection
      const pc = new RTCPeerConnection()

      // Set up to play remote audio from the model
      audioElement.current = document.createElement('audio')
      audioElement.current.autoplay = true
      pc.ontrack = (e) => {
        if (audioElement.current) {
          audioElement.current.srcObject = e.streams[0]
        }
      }

      // Add local audio track for microphone input in the browser
      const ms = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })
      pc.addTrack(ms.getTracks()[0])

      // Set up data channel for sending and receiving events
      const dc = pc.createDataChannel('oai-events')
      setDataChannel(dc)

      // Start the session using the Session Description Protocol (SDP)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Use environment variables for realtime endpoint configuration
      const baseUrl = import.meta.env.VITE_REALTIME_BASE_URL
      const model = import.meta.env.VITE_REALTIME_MODEL
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          'Content-Type': 'application/sdp',
        },
      })

      const answer: RTCSessionDescriptionInit = {
        type: 'answer' as RTCSdpType,
        sdp: await sdpResponse.text(),
      }
      await pc.setRemoteDescription(answer)

      peerConnection.current = pc
      setIsActivatingSession(false)
    } catch (error) {
      console.error('Failed to start realtime session:', error)
      toast.error(`リアルタイムセッションの開始に失敗しました: ${error.message}`)
      setIsActivatingSession(false)
    }
  }

  // Stop realtime session
  const stopRealtimeSession = () => {
    if (dataChannel) {
      dataChannel.close()
    }

    if (peerConnection.current) {
      peerConnection.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop()
        }
      })
      peerConnection.current.close()
    }

    setIsSessionActive(false)
    setDataChannel(null)
    peerConnection.current = null
    
    if (audioElement.current) {
      audioElement.current.srcObject = null
    }
  }

  // Send a message to the realtime model
  const sendRealtimeEvent = (message: any) => {
    if (dataChannel && dataChannel.readyState === 'open') {
      const timestamp = new Date().toLocaleTimeString()
      message.event_id = message.event_id || crypto.randomUUID()

      dataChannel.send(JSON.stringify(message))

      if (!message.timestamp) {
        message.timestamp = timestamp
      }
      setEvents((prev) => [message, ...prev])
    } else {
      console.error('Failed to send message - no data channel available', message)
    }
  }

  // Send a text message to the realtime model
  const sendRealtimeTextMessage = (messageText: string) => {
    // Add user message to chat immediately
    const userMessage: Message = {
      id: `user-text-${Date.now()}`,
      text: messageText,
      isUser: true,
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, userMessage])

    // Send to realtime API
    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: messageText,
          },
        ],
      },
    }

    sendRealtimeEvent(event)
    sendRealtimeEvent({ type: 'response.create' })
  }

  // Generate explanation for a message
  const generateExplanationForMessage = async (aiText: string, userText: string) => {
    try {
      const explanationResponse = await callExplanationAPI(userText, aiText)
      
      const explanation = JSON.parse(explanationResponse)
      const newExplanation: Explanation = {
        id: Date.now().toString(),
        ...explanation
      }
      setExplanations(prev => [newExplanation, ...prev])
    } catch (e) {
      console.error('Failed to generate explanation:', e)
    }
  }

  // Generate translation for a message
  const generateTranslationForMessage = async (aiMessage: Message) => {
    if (!(import.meta.env.VITE_TRANSLATION_ENABLED === 'on')) return

    try {
      const translation = await callTranslateAPI(aiMessage.text)
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === aiMessage.id 
            ? { ...msg, translation }
            : msg
        )
      )
    } catch (e) {
      console.error('Failed to translate message:', e)
    }
  }

  const sendMessage = async () => {
    if (!currentInput.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: currentInput.trim(),
      isUser: true,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    setCurrentInput('')
    setIsLoading(true)

    try {
      const aiResponse = await callChatAPI(userMessage.text)
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: Date.now()
      }

      setMessages(prev => [...prev, aiMessage])

      // Generate Japanese explanation and translation using new API
      try {
        const explanationResponse = await callExplanationAPI(userMessage.text, aiResponse)
        const explanation = JSON.parse(explanationResponse)
        const newExplanation: Explanation = {
          id: Date.now().toString(),
          ...explanation
        }
        setExplanations(prev => [newExplanation, ...prev])

        // Generate translation using new function
        generateTranslationForMessage(aiMessage)
      } catch (e) {
        console.error('Failed to parse explanation:', e)
      }

    } catch (error) {
      toast.error('応答の生成に失敗しました。もう一度お試しください。')
      console.error('Error generating response:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    }
  }

  const ExplanationPanel = () => (
    <div className="flex flex-col h-full">
      {/* Fixed Header */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <h2 className="text-xl font-semibold">日本語解説</h2>
        <p className="text-sm text-muted-foreground mt-1">
          会話を始めると、使用した英語の日本語解説がここに表示されます。
        </p>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4">
          {explanations.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Chat size={48} className="mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  英語で会話を始めると解説が表示されます
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {explanations.map((explanation) => (
                <Card key={explanation.id} className="p-4 bg-secondary">
                  <div className="space-y-2">
                    <div className="font-medium text-sm text-primary">
                      {explanation.english}
                    </div>
                    <div className="text-sm leading-relaxed">
                      {explanation.japanese}
                    </div>
                    {explanation.grammar && (
                      <>
                        <Separator className="my-2" />
                        <div className="text-xs text-muted-foreground">
                          <strong>文法:</strong> {explanation.grammar}
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )

  return (
    <>
      <div className="h-screen bg-background flex flex-col">
        {/* Fixed Header */}
        <div className="bg-card border-b border-border p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">English Chat</h1>
            <div className="flex items-center gap-2">
              {/* Realtime Session Control */}
              {!isSessionActive ? (
                <Button
                  onClick={startRealtimeSession}
                  disabled={isActivatingSession}
                  className={`${isActivatingSession ? 'bg-gray-600' : 'bg-red-600'} hover:bg-red-700 text-white`}
                >
                  <CloudLightning size={16} className="mr-2" />
                  {isActivatingSession ? 'セッション開始中...' : 'リアルタイム開始'}
                </Button>
              ) : (
                <Button
                  onClick={stopRealtimeSession}
                  variant="destructive"
                >
                  <X size={16} className="mr-2" />
                  セッション終了
                </Button>
              )}
              
              {isMobile && (
                <Sheet open={isExplanationOpen} onOpenChange={setIsExplanationOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                      <BookOpen size={20} />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:w-80">
                    <SheetHeader>
                      <SheetTitle>日本語解説</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 h-full">
                      <ExplanationPanel />
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Scrollable Chat Messages */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
                {!hasStarted ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center max-w-md">
                      <Chat size={64} className="mx-auto mb-4 text-muted-foreground" />
                      <h2 className="text-xl font-semibold mb-2">英会話を始めましょう！</h2>
                      <p className="text-muted-foreground">
                        マイクボタンで音声入力、またはテキストで入力してください。
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className="space-y-2">
                        {/* Main message */}
                        <div
                          className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-2`}
                        >
                          <div className={`max-w-[85%] sm:max-w-[80%] relative ${message.isUser ? 'ml-auto' : 'mr-auto'}`}>
                            <div className={`relative p-3 rounded-2xl ${
                              message.isUser 
                                ? 'bg-primary text-primary-foreground rounded-br-md' 
                                : 'bg-card border border-border rounded-bl-md'
                            }`}>
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
                                {!message.isUser && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="shrink-0 h-6 w-6 p-0 hover:bg-muted"
                                    onClick={() => speakText(message.text)}
                                  >
                                    <SpeakerHigh size={14} />
                                  </Button>
                                )}
                              </div>
                              
                              {/* Speech bubble tail */}
                              <div className={`absolute bottom-0 w-3 h-3 ${
                                message.isUser
                                  ? 'right-0 bg-primary transform translate-x-1 translate-y-1 rounded-bl-full'
                                  : 'left-0 bg-card border-l border-b border-border transform -translate-x-1 translate-y-1 rounded-br-full'
                              }`} />
                            </div>
                          </div>
                        </div>

                        {/* Translation message */}
                        {!message.isUser && message.translation && (
                          <div className="flex justify-start">
                            <div className="max-w-[85%] sm:max-w-[80%] mr-auto">
                              <div className="relative p-3 rounded-2xl bg-blue-50 border border-blue-200 rounded-bl-md">
                                <div className="flex items-start gap-2">
                                  <p className="text-sm leading-relaxed text-blue-800">
                                    {message.translation}
                                  </p>
                                </div>
                                
                                {/* Speech bubble tail */}
                                <div className="absolute bottom-0 left-0 w-3 h-3 bg-blue-50 border-l border-b border-blue-200 transform -translate-x-1 translate-y-1 rounded-br-full" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start mb-4">
                        <div className="relative bg-card border border-border rounded-2xl rounded-bl-md p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                          
                          {/* Speech bubble tail */}
                          <div className="absolute bottom-0 left-0 w-3 h-3 bg-card border-l border-b border-border transform -translate-x-1 translate-y-1 rounded-br-full" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Fixed Input Area */}
            <div className="p-4 bg-card border-t border-border flex-shrink-0">
              {isSessionActive ? (
                /* Realtime Mode Input */
                <div className="flex gap-2">
                  <Input
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && currentInput.trim()) {
                        e.preventDefault()
                        sendRealtimeTextMessage(currentInput.trim())
                        setCurrentInput('')
                      }
                    }}
                    placeholder="リアルタイムモード: 音声またはテキストで会話..."
                    className="flex-1"
                  />
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    variant={isRecording ? "destructive" : "outline"}
                    size="icon"
                    className={`${isRecording ? "animate-pulse" : ""} shrink-0`}
                    title="従来の音声認識を使用"
                  >
                    <Microphone size={20} />
                  </Button>
                  <Button
                    onClick={() => {
                      if (currentInput.trim()) {
                        sendRealtimeTextMessage(currentInput.trim())
                        setCurrentInput('')
                      }
                    }}
                    disabled={!currentInput.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                    size="icon"
                  >
                    <PaperPlaneTilt size={20} />
                  </Button>
                </div>
              ) : (
                /* Traditional Mode Input */
                <div className="flex gap-2">
                  <Input
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="英語でメッセージを入力..."
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    variant={isRecording ? "destructive" : "outline"}
                    size="icon"
                    className={`${isRecording ? "animate-pulse" : ""} shrink-0`}
                  >
                    <Microphone size={20} />
                  </Button>
                  <Button
                    onClick={sendMessage}
                    disabled={!currentInput.trim() || isLoading}
                    className="bg-accent hover:bg-accent/90 shrink-0"
                    size="icon"
                  >
                    <PaperPlaneTilt size={20} />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Explanation Panel */}
          {!isMobile && (
            <div className="w-80 bg-card border-l border-border flex-shrink-0">
              <ExplanationPanel />
            </div>
          )}
        </div>
      </div>
      <Toaster position="top-right" />
    </>
  )
}

export default App