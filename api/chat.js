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

        const systemMessage = messages.find(
            message => message.role === "system"
        );

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

        const openaiResponse = await fetch(
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

                    input: conversation,

                    stream: true
                })
            }
        );

        if (!openaiResponse.ok) {
            const errorText = await openaiResponse.text();

            console.error(errorText);

            return res.status(openaiResponse.status).json({
                error: errorText
            });
        }

        res.statusCode = 200;

        res.setHeader(
            "Content-Type",
            "text/event-stream; charset=utf-8"
        );

        res.setHeader(
            "Cache-Control",
            "no-cache, no-transform"
        );

        const reader = openaiResponse.body.getReader();

        while (true) {
            const { value, done } = await reader.read();

            if (done) {
                break;
            }

            res.write(Buffer.from(value));
        }

        res.end();

    } catch (error) {
        console.error(error);

        if (!res.headersSent) {
            return res.status(500).json({
                error: "Server error"
            });
        }

        res.end();
    }
}
