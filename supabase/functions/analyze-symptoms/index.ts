import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symptoms, location } = await req.json();
    
    // Validate input length
    if (!symptoms || symptoms.length > 2000 || (location && location.length > 200)) {
      return new Response(JSON.stringify({ error: 'Invalid input data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a medical AI assistant. Analyze symptoms and provide clear, well-formatted recommendations.

Format your response EXACTLY like this:

🔍 SYMPTOM ANALYSIS
[Brief analysis of symptoms in 2-3 lines]

📋 RECOMMENDED SPECIALISTS
1. [Specialist Type] - [Reason why they should visit this specialist]
2. [Specialist Type] - [Reason]
3. [Specialist Type] - [Reason]

⚠️ URGENCY LEVEL
[Low/Medium/High] - [Brief explanation]

💡 GENERAL ADVICE
• [Advice point 1]
• [Advice point 2]
• [Advice point 3]

Keep it clear, concise and easy to read. Use simple language.`
          },
          {
            role: 'user',
            content: `Patient symptoms: ${symptoms}\nLocation: ${location || 'Not specified'}`
          }
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (response.status === 402) {
      return new Response(JSON.stringify({ error: 'Service unavailable. Please contact support.' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ analysis: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-symptoms:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    return new Response(JSON.stringify({ error: 'Unable to analyze symptoms. Please try again later.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
