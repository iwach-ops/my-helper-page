export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Only POST is allowed"
        });
    }

    try {
        const { messages } = req.body || {};

        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                error: "Messages are missing"
            });
        }

        // System-Prompt aus dem Frontend herausnehmen
        const systemMessage = messages.find(
            message => message.role === "system"
        );

        // Nur normale Unterhaltung an OpenAI senden
        const conversation = messages
            .filter(
                message =>
                    message.role === "user" ||
                    message.role === "assistant"
            )
            .map(message => ({
                role: message.role,
                content: message.content
            }));

        const response = await fetch(
            "https://api.openai.com/v1/responses",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization":
                        `Bearer ${process.env.OPENAI_API_KEY}`
                },

                body: JSON.stringify({
                    model: "gpt-5.6-luna",
                    instructions:
                        systemMessage?.content ||
                        "You are a helpful assistant.",
                    input: conversation
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("OpenAI error:", data);

            return res.status(response.status).json({
                error:
                    data.error?.message ||
                    "OpenAI API error"
            });
        }

        const text = (data.output || [])
            .filter(item => item.type === "message")
            .flatMap(item => item.content || [])
            .filter(item => item.type === "output_text")
            .map(item => item.text)
            .join("");

        return res.status(200).json({
            text: text || "Keine Antwort erhalten."
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Server error"
        });
    }
}
