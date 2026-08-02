import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

API_KEY = os.environ.get("GROQ_API_KEY")
if not API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY not found. Copy .env.example to .env and add your key."
    )

client = Groq(api_key=API_KEY)
MODEL_NAME = "llama-3.3-70b-versatile"

if __name__ == "__main__":
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": "Say OK"}],
    )
    print(response.choices[0].message.content)
