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
    const { faceImage, breathingRate, hasBreathingData } = await req.json();
    
    console.log('Received request:', { 
      hasImage: !!faceImage, 
      imageLength: faceImage?.length || 0,
      breathingRate, 
      hasBreathingData 
    });
    
    if (!faceImage || faceImage.length > 10000000) {
      console.error('Invalid image data');
      return new Response(JSON.stringify({ error: 'Invalid input data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Service configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Calling Lovable AI...');
    
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
            content: `You are a medical AI assistant specialized in health detection. Analyze the patient's face photo and breathing data to detect potential health issues.

Format your response EXACTLY like this:

🏥 HEALTH ASSESSMENT
[Brief assessment of overall health status based on facial analysis]

🌡️ TEMPERATURE & VITAL SIGNS ANALYSIS
[Analysis of temperature indicators visible in face - flushed skin, pale complexion, etc.]
${hasBreathingData ? `[Breathing rate analysis - Normal: 12-20 breaths/min, Patient: ${breathingRate.toFixed(1)} breaths/min]` : '[No breathing data available]'}

💓 DETECTED INDICATORS
• [Health indicator 1 - e.g., Flushed face may indicate fever]
• [Health indicator 2 - e.g., Pale complexion]
• [Health indicator 3 - e.g., Breathing pattern]

⚠️ HEALTH STATUS
[Normal/Mild Concern/Medical Attention Needed] - [Brief explanation]

💡 RECOMMENDATIONS
• [Recommendation 1]
• [Recommendation 2]
• [Recommendation 3]

⚠️ DISCLAIMER: This is an AI-based preliminary assessment. Please consult a healthcare professional for accurate diagnosis.

Keep it clear, concise and easy to read. Use simple language.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this person's health status. ${hasBreathingData ? `Breathing rate: ${breathingRate.toFixed(1)} breaths per minute.` : 'No breathing data available.'}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${faceImage}`
                }
              }
            ]
          }
        ],
      }),
    });
    
    console.log('AI Response status:', response.status);

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
    console.log('AI Response received:', { hasChoices: !!data.choices });
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid AI response structure:', data);
      return new Response(JSON.stringify({ error: 'Invalid response from AI service' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ analysis: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in detect-health:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return new Response(JSON.stringify({ error: 'Unable to analyze health. Please try again later.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
