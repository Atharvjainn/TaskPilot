"""
NLU layer for TaskPilot.
Extracts intent and raw entities from voice transcripts using Groq's official Python SDK.

Intents supported:
1. create_snag: User intends to report or log an issue/defect/snag.
2. assign_task: User intends to assign/create a work task or assignment for a contractor.
3. search_records: User intends to search, view, or filter snags or assigned tasks.
"""

import os
import json
from typing import Dict, Any
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_snag",
            "description": "Log or create a new snag, defect, or site issue in the construction or interior fit-out project.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Concise summary of the snag/issue (e.g. 'Ceiling paint cracking', 'Leaking pipe under sink')."
                    },
                    "location": {
                        "type": ["string", "null"],
                        "description": "Raw location mentioned by user (e.g. 'master bathroom', 'kitchen', 'balcony')."
                    },
                    "contractor": {
                        "type": ["string", "null"],
                        "description": "Raw contractor name, trade, or role mentioned (e.g. 'false ceiling', 'plumber', 'carpenter')."
                    },
                    "priority": {
                        "type": ["string", "null"],
                        "enum": ["Low", "Medium", "High", "Critical", None],
                        "description": "Priority level if specified or implied by urgency."
                    },
                    "description": {
                        "type": ["string", "null"],
                        "description": "Additional details or notes about the defect."
                    }
                },
                "required": ["title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "assign_task",
            "description": "Create and assign a work task, job, or work order to a contractor or trade for a specific location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Title or summary of the task to be completed (e.g. 'Install thermostatic mixer', 'Mount electrical switchboards')."
                    },
                    "contractor": {
                        "type": "string",
                        "description": "Contractor name, trade, or role assigned to the task (e.g. 'plumbing', 'false ceiling', 'electrical', 'carpentry')."
                    },
                    "location": {
                        "type": ["string", "null"],
                        "description": "Location or room for the task (e.g. 'master bathroom', 'kitchen', 'living room')."
                    },
                    "due_date": {
                        "type": ["string", "null"],
                        "description": "Target completion date or timeframe if mentioned (e.g. 'by Friday', 'tomorrow', 'next week')."
                    },
                    "priority": {
                        "type": ["string", "null"],
                        "enum": ["Low", "Medium", "High", "Critical", None],
                        "description": "Priority level of the task."
                    },
                    "description": {
                        "type": ["string", "null"],
                        "description": "Additional notes or instructions for the contractor."
                    }
                },
                "required": ["title", "contractor"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_records",
            "description": "Search, query, filter, or list existing snags/defects or assigned tasks/work orders in the project.",
            "parameters": {
                "type": "object",
                "properties": {
                    "record_type": {
                        "type": ["string", "null"],
                        "enum": ["snag", "task", None],
                        "description": "Type of records to search for: 'snag' for defects/issues, 'task' for assigned work tasks/orders. Defaults to 'snag' if ambiguous."
                    },
                    "location": {
                        "type": ["string", "null"],
                        "description": "Location to filter records by (e.g. 'master bathroom', 'kitchen')."
                    },
                    "contractor": {
                        "type": ["string", "null"],
                        "description": "Contractor name or trade to filter records by (e.g. 'electrical', 'plumbing')."
                    },
                    "status": {
                        "type": ["string", "null"],
                        "description": "Status to filter by (e.g. 'Open', 'Pending', 'In Progress', 'Resolved', 'Closed', 'Completed')."
                    },
                    "query": {
                        "type": ["string", "null"],
                        "description": "Keyword search query for finding specific records."
                    }
                }
            }
        }
    }
]

SYSTEM_PROMPT = """You are TaskPilot NLU, a voice command interpreter for construction and interior fit-out project management.
Your job is to parse speech transcripts and invoke the appropriate tool:
- `create_snag`: For commands creating, logging, adding, reporting, or raising a snag/defect/issue/flaw to be fixed.
- `assign_task`: For commands creating, scheduling, giving, delegating, or assigning a new work task/job/order to a contractor or trade.
- `search_records`: For commands querying, finding, showing, listing, checking, or viewing existing snags/defects or assigned work tasks/orders (set record_type to 'snag' or 'task').

Always call one of the tools if the user's intent matches. Extract entities accurately from the transcript as spoken.
Do not pass null for fields that are not mentioned; omit them from the arguments whenever possible."""


def extract_intent_and_entities(transcript: str) -> Dict[str, Any]:
    """
    Calls Groq using the official native Groq SDK.
    """
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        raise ValueError("GROQ_API_KEY is not set. Please add GROQ_API_KEY=gsk_... to your backend/.env file.")

    client = Groq(api_key=groq_key)
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": transcript}
        ],
        tools=TOOLS,
        tool_choice="auto",
        temperature=0.0
    )

    choice = response.choices[0].message

    if choice.tool_calls:
        tool_call = choice.tool_calls[0]
        try:
            args = json.loads(tool_call.function.arguments)
        except Exception:
            args = {}

        return {
            "intent": tool_call.function.name,
            "raw_entities": args,
            "raw_transcript": transcript,
            "provider": "Groq",
            "model": model
        }

    return {
        "intent": "unknown",
        "raw_entities": {},
        "raw_transcript": transcript,
        "message": choice.content if choice.content else "Could not understand the command.",
        "provider": "Groq",
        "model": model
    }


if __name__ == "__main__":
    # Sanity check against hardcoded examples
    test_cases = [
        "Create a snag for the master bathroom ceiling, assign it to the false-ceiling contractor",
        "Assign task to plumber: install bathroom shower mixer in master bathroom by Friday",
        "Show me all open snags in the kitchen assigned to plumbing",
        "Show me tasks assigned to the electrician"
    ]

    print("Running NLU sanity tests with Groq SDK...")
    for idx, test_text in enumerate(test_cases, 1):
        print(f"\n--- Test {idx} ---")
        print(f"Transcript: \"{test_text}\"")
        try:
            result = extract_intent_and_entities(test_text)
            print(f"Result: {json.dumps(result, indent=2)}")
        except Exception as e:
            print(f"Error: {e}")
