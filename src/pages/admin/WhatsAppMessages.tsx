import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, User, Bot, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface WhatsAppConversation {
  id: string;
  phone_number: string;
  language: string;
  created_at: string;
  updated_at: string;
  messages: WhatsAppMessage[];
}

interface WhatsAppMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  metadata?: any;
}

const WhatsAppMessages = () => {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      
      // Fetch WhatsApp conversations
      const { data: convos, error: convError } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('channel', 'whatsapp')
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      if (convos) {
        // Fetch messages for each conversation
        const conversationsWithMessages = await Promise.all(
          convos.map(async (convo) => {
            const { data: messages } = await supabase
              .from('chat_messages')
              .select('*')
              .eq('conversation_id', convo.id)
              .order('created_at', { ascending: true });

            // Map messages to ensure correct role type
            const typedMessages: WhatsAppMessage[] = (messages || []).map((msg: any) => ({
              id: msg.id,
              role: (msg.role === 'assistant' || msg.role === 'user') ? msg.role : 'user',
              content: msg.content,
              created_at: msg.created_at,
              metadata: msg.metadata
            }));

            return {
              id: convo.id,
              phone_number: convo.phone_number || '',
              language: convo.language || 'en',
              created_at: convo.created_at,
              updated_at: convo.updated_at,
              messages: typedMessages
            };
          })
        );

        setConversations(conversationsWithMessages);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load WhatsApp messages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedConvo = conversations.find(c => c.id === selectedConversation);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Messages</h1>
          <p className="text-muted-foreground">View all WhatsApp conversations</p>
        </div>
        <Badge variant="secondary">
          {conversations.length} Conversations
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Conversations List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <CardDescription>Recent WhatsApp chats</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No WhatsApp messages yet</p>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {conversations.map((convo) => (
                    <div
                      key={convo.id}
                      onClick={() => setSelectedConversation(convo.id)}
                      className={`p-4 rounded-lg cursor-pointer transition-colors ${
                        selectedConversation === convo.id
                          ? 'bg-primary/10 border-primary'
                          : 'bg-card hover:bg-accent'
                      } border`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{convo.phone_number}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {convo.language.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {convo.messages[convo.messages.length - 1]?.content || 'No messages'}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(convo.updated_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Messages View */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedConvo ? `Chat with ${selectedConvo.phone_number}` : 'Select a conversation'}
            </CardTitle>
            {selectedConvo && (
              <CardDescription>
                Started on {format(new Date(selectedConvo.created_at), 'MMMM d, yyyy')}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {selectedConvo ? (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {selectedConvo.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                          message.role === 'assistant'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {message.role === 'assistant' ? (
                          <Bot className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div
                        className={`flex-1 max-w-[80%] rounded-lg p-3 ${
                          message.role === 'assistant'
                            ? 'bg-muted'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        {message.metadata?.suggestions && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {message.metadata.suggestions.map((suggestion: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {suggestion}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-xs opacity-70 mt-1">
                          {format(new Date(message.created_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[600px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to view messages</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Setup Instructions</CardTitle>
          <CardDescription>Configure your Meta WhatsApp Business webhook</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Webhook URL:</h3>
            <code className="block p-3 bg-muted rounded-md text-sm">
              https://frgblvloxhcnwrgvjazk.supabase.co/functions/v1/whatsapp-webhook
            </code>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Verify Token:</h3>
            <code className="block p-3 bg-muted rounded-md text-sm">
              bepawa_whatsapp_verify_9c4f2c5d
            </code>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Steps:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Go to Meta for Developers (developers.facebook.com)</li>
              <li>Navigate to your WhatsApp Business App</li>
              <li>Go to WhatsApp → Configuration</li>
              <li>Under "Webhook", click "Edit"</li>
              <li>Paste the Webhook URL and Verify Token above</li>
              <li>Subscribe to "messages" webhook field</li>
              <li>Save and verify the webhook</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppMessages;
