import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => null) as { imageBase64?: string; mimeType?: string } | null;
    if (!body?.imageBase64 || !body?.mimeType) {
      return new Response(JSON.stringify({ error: 'imageBase64 and mimeType are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dataUrl = `data:${body.mimeType};base64,${body.imageBase64}`;

    const tool = {
      type: 'function',
      function: {
        name: 'return_picklist_parts',
        description: 'Return every line item parsed from the picklist image.',
        parameters: {
          type: 'object',
          properties: {
            parts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  partNumber: { type: 'string' },
                  qty: { type: 'string' },
                  jobNumber: { type: 'string' },
                  soNumber: { type: 'string' },
                  goesWith: { type: 'string' },
                  description: { type: 'string' },
                  rev: { type: 'string' },
                  item: { type: 'string' },
                },
                required: ['partNumber', 'qty', 'jobNumber', 'soNumber', 'goesWith', 'description', 'rev', 'item'],
                additionalProperties: false,
              },
            },
            packUnit: {
              type: 'object',
              properties: {
                salesOrder: { type: 'string' },
                project: { type: 'string' },
                unitIndicator: { type: 'string' },
              },
              required: ['salesOrder', 'project', 'unitIndicator'],
              additionalProperties: false,
            },
          },
          required: ['parts', 'packUnit'],
          additionalProperties: false,
        },
      },
    };

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content:
              [
                'You extract line items from manufacturing picklists. Return ONLY strings (empty string for missing fields). Do not invent values.',
                'Layout rules for these picklists:',
                '- SO (Sales Order) number is printed in the TOP LEFT of the document and applies to every line on the page unless a line clearly overrides it.',
                '- Each line item shows the Part Number as the main heading.',
                '- The Part Description is printed on the line directly UNDERNEATH the Part Number.',
                '- The Rev is printed to the RIGHT of the Part Description.',
                '- Line and Release (Rel) values are printed directly UNDERNEATH the Part Number in their own titled sections/columns (labels like "Line" and "Rel" / "Release"). Combine them into the soNumber field as "SO-Line-Rel" when all are present, otherwise just include what is available.',
                '- Qty, Job Number, Goes With, and Item come from their respective labeled columns.',
                'Map fields exactly: partNumber, qty, jobNumber, soNumber (SO/Line/Rel), goesWith, description, rev, item. Return every line item on the page.',
                'CRITICAL — split lines across pages: A single Line item often gets cut by a page boundary. When that happens the SAME Line number appears in titled "Line" sections on TWO (or more) pages, each holding only PART of the data (e.g. page 1 shows the Part Number + Description, page 2 shows the Line/Rel/Qty/Job rows for that same Line number). You MUST detect this and MERGE those partial fragments into ONE single output row, keyed by the Line number (the value in the "Line" titled column, e.g. 1,2,3,4,5). Do not emit duplicate rows for the same Line. After merging, the output should have exactly one row per unique Line number found across all pages, with fields combined from wherever they appear. Never invent missing values — only combine what is actually printed somewhere on the document.',
                'ALSO return a single "packUnit" object describing the shipment unit for this picklist:',
                '- salesOrder: the SO number from the top-left of the document (same as the SO used on the part lines).',
                '- project: the project / customer name printed on the SAME line as the SO, immediately to its RIGHT. Empty string if not present.',
                '- unitIndicator: a short raw token used to decide the unit type. Look in the TOP-RIGHT region of the picklist. If you see the text "C-Pallet" (case-insensitive, anywhere on the picklist, but typically top-right quadrant), return "C-Pallet". Otherwise, if there is a single letter "F" notation in the top-right (often preceding a unit/box marker), return "F". Otherwise return "".',
              ].join('\n'),
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract every part line from this picklist. Return all rows.' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [tool],
        tool_choice: { type: 'function', function: { name: 'return_picklist_parts' } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(JSON.stringify({ error: errText || 'AI gateway error' }), {
        status: aiRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = call?.function?.arguments;
    if (!argsStr) {
      return new Response(JSON.stringify({ error: 'No tool call returned', raw: data }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let parsed: { parts: unknown[] };
    try {
      parsed = JSON.parse(argsStr);
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse tool arguments' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const norm = (Array.isArray(parsed.parts) ? parsed.parts : []).map((p: any) => ({
      partNumber: String(p?.partNumber ?? ''),
      qty: String(p?.qty ?? ''),
      jobNumber: String(p?.jobNumber ?? ''),
      soNumber: String(p?.soNumber ?? ''),
      goesWith: String(p?.goesWith ?? ''),
      description: String(p?.description ?? ''),
      rev: String(p?.rev ?? ''),
      item: String(p?.item ?? ''),
    }));

    const pu = (parsed as any)?.packUnit ?? {};
    const packUnit = {
      salesOrder: String(pu?.salesOrder ?? ''),
      project: String(pu?.project ?? ''),
      unitIndicator: String(pu?.unitIndicator ?? ''),
    };

    return new Response(JSON.stringify({ parts: norm, packUnit }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});