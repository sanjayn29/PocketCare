
import FloatingActionButton from '@/components/FloatingActionButton'
import { getAIResponse, getProductivityInsight } from '@/lib/ai-service'
import { useUser } from '@clerk/expo'
import React, { useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native'

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

export default function AIScreen() {
  const { user } = useUser()
  const email = user?.emailAddresses?.[0]?.emailAddress
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [showInsight, setShowInsight] = useState(true)
  const [insight, setInsight] = useState('')
  const flatListRef = useRef<FlatList>(null)

  // Load productivity insight on mount
  useEffect(() => {
    if (email) {
      loadInsight()
      // Add welcome message
      setMessages([
        {
          id: '0',
          text: 'Hi! 👋 I\'m your PocketCare AI Assistant. I can help you with task management, goal tracking, health tips, and productivity advice. What can I help you with today?',
          isUser: false,
          timestamp: new Date(),
        },
      ])
    }
  }, [email])

  const loadInsight = async () => {
    if (!email) return
    const insightText = await getProductivityInsight(email)
    setInsight(insightText)
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || !email) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputText('')
    setLoading(true)
    setShowInsight(false)

    // Get AI response
    const conversationHistory = messages.map((msg) => ({
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.text,
    }))

    const aiResponse = await getAIResponse(inputText, email, conversationHistory)

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: aiResponse,
      isUser: false,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, aiMessage])
    setLoading(false)

    // Auto-scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }

  const renderMessage = (item: Message) => (
    <View
      style={[
        styles.messageContainer,
        item.isUser ? styles.userMessageContainer : styles.aiMessageContainer,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          item.isUser ? styles.userBubble : styles.aiBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.isUser ? styles.userText : styles.aiText,
          ]}
        >
          {item.text}
        </Text>
      </View>
    </View>
  )

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🤖 Pocket AI</Text>
        <Text style={styles.headerSubtitle}>Your Personal Assistant</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => renderMessage(item)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContent}
        scrollEnabled={true}
        ListFooterComponent={
          <>
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a9eff" />
              </View>
            )}
            {showInsight && insight && (
              <View style={styles.insightCard}>
                <Text style={styles.insightTitle}>💡 Productivity Tip</Text>
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            )}
          </>
        }
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true })
        }}
      />

      <View style={styles.inputWrapper}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask me anything..."
            placeholderTextColor="#7a8099"
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={loading || !inputText.trim()}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
        <FloatingActionButton />
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1f3a',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#7a8099',
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexGrow: 1,
  },
  messageContainer: {
    marginVertical: 6,
    flexDirection: 'row',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  userBubble: {
    backgroundColor: '#4a9eff',
  },
  aiBubble: {
    backgroundColor: '#161b33',
    borderWidth: 1,
    borderColor: '#1a1f3a',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#e0e0e0',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  insightCard: {
    marginHorizontal: 12,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#161b33',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffa500',
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffa500',
    marginBottom: 6,
  },
  insightText: {
    fontSize: 13,
    color: '#e0e0e0',
    lineHeight: 18,
  },
  inputWrapper: {
    paddingBottom: 80,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1f3a',
    backgroundColor: '#0a0e27',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#161b33',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#1a1f3a',
  },
  sendButton: {
    backgroundColor: '#4a9eff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#1a1f3a',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
})
