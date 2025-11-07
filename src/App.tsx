import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { Chat, GoogleGenAI } from "@google/genai";
import { type ChatMessage } from "./types";

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const initChat = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("./data/informacion-universidad.json");
      if (!response.ok) {
        throw new Error(
          "Ocurrio un error al cargar la información de la universidad."
        );
      }
      const universityData = await response.json();
      const context = JSON.stringify(universityData, null, 2);

      const systemInstruction = `Eres un chatbot servicial y amigable del Instituto Tecnológico Superior de Cajeme. 
                                Tu objetivo es responder a las preguntas de los estudiantes actuales o potenciales.
                                Debes basar tus respuestas *únicamente* en la información proporcionada en los siguientes datos JSON.
                                No utilices ningún conocimiento externo ni inventes información.
                                Las respuestas pueden ser formulaciones con base en la información proporcionada de los datos JSON.
                                Si la respuesta a una pregunta no se encuentra en los datos proporcionados, debes indicar claramente que no dispones de esa información y sugerir que se pongan en contacto directamente con la universidad.
                                Aquí tienes la información de la universidad:
                                --- ${context} ---`;

      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error("API_KEY no ha sido declarada");
      }
      const ai = new GoogleGenAI({
        apiKey: import.meta.env.VITE_GEMINI_API_KEY,
      });
      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: systemInstruction,
        },
      });

      setChatSession(chat);
      setMessages([
        {
          role: 'model',
          text: `¡Hola! Soy el chatbot de la carrera de Sistemas Computacionales. ¿Cómo puedo ayudarte el día de hoy?`,
        },
      ]);
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : "Ha ocurrido un error durante la inicialización.";
      console.error(errorMessage);
      setError(errorMessage);
      setMessages([
        {
          role: 'system',
          text: `Error: No se ha podido iniciar el chatbot. ${errorMessage}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initChat();
  }, [initChat]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading || !chatSession) return;

    const userMessage: ChatMessage = {
      role: 'user',
      text: messageText,
    };
    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatSession.sendMessage({ message: messageText });
      const modelResponse: ChatMessage = {
        role: 'model',
        text: response.text ?? "",
      };
      setMessages((prev) => [...prev, modelResponse]);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Se ha producido un error desconocido.";
      console.error(e);
      setError("Falló al obtener respuesta del modelo.");
      const errorResponse: ChatMessage = {
        role: 'system',
        text: `Lo sentimos, algo ha salido mal. ${errorMessage}`,
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(userInput);
  };

  const handleSuggestionClick = async (question: string) => {
    await sendMessage(question);
  };

  const MessageBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
    const isUser = msg.role === 'user';
    const isSystem = msg.role === 'system';
    console.log(msg.role, msg.role === 'user');
    if (isSystem) {
      return (
        <div className="flex justify-center my-2">
          <p className="px-4 py-2 text-sm text-center text-red-700 bg-red-100 rounded-full dark:bg-red-900 dark:text-red-200">
            {msg.text}
          </p>
        </div>
      );
    }

    return (
      <div
        className={`flex items-start gap-3 my-4 ${
          isUser ? "justify-end" : "justify-start"
        }`}
      >
        {!isUser && (
          <div className="shrink-0 w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="currentColor"
              className="w-6 h-6 text-gray-600 dark:text-gray-300"
            >
              <path d="M480-40q-23 0-46-3t-46-8Q300 14 194.5-4.5T33-117q-45-74-29-159t77-143v-3Q19-479 4-562.5T32-720q37-63 102-95.5T271-838q32-57 87.5-89.5T480-960q66 0 121.5 32.5T689-838q72-10 137 22.5T928-720q43 74 28 157.5T879-422v3q61 58 77 143t-29 159Q871-23 765.5-4.5T572-51q-23 5-46 8t-46 3ZM288-90q-32-18-61-41.5T174-183q-24-28-42.5-60.5T101-311q-20 36-20 76.5t21 75.5q29 48 81.5 68.5T288-90Zm384 0q52 20 104.5-.5T858-159q21-35 21-75.5T859-311q-12 35-30.5 67.5T786-183q-24 28-52.5 51.5T672-90Zm-192-30q134 0 227-93t93-227q0-29-4.5-55.5T782-547q-29 20-64 31t-73 11q-102 0-173.5-71.5T400-750q-104 26-172 112t-68 198q0 134 93 227t227 93ZM360-350q-21 0-35.5-14.5T310-400q0-21 14.5-35.5T360-450q21 0 35.5 14.5T410-400q0 21-14.5 35.5T360-350Zm240 0q-21 0-35.5-14.5T550-400q0-21 14.5-35.5T600-450q21 0 35.5 14.5T650-400q0 21-14.5 35.5T600-350ZM94-544q9-33 23-63.5t33-57.5q19-27 41.5-51t48.5-44q-43 0-79.5 21T102-681q-20 32-22 67t14 70Zm772 0q16-35 14-70t-22-67q-22-37-58.5-58T720-760q26 20 48.5 44t41.5 51q19 27 33 57.5t23 63.5Zm-221-41q29 0 54-9t46-25q-21-32-50-57.5T632-721q-34-19-72-29t-80-10v10q0 69 48 117t117 48Zm-54-239q-20-26-49-41t-62-15q-33 0-62 15t-49 41q26-8 54-12t57-4q29 0 57 4t54 12ZM150-665Zm660 0Zm-330-85Zm0-90ZM174-183Zm612 0Z" />
            </svg>
          </div>
        )}
        <div
          className={`max-w-xs md:max-w-md lg:max-w-2xl px-4 py-3 rounded-2xl shadow-md text-justify ${
            isUser
              ? "bg-gray-900 text-white rounded-br-lg"
              : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-lg"
          }`}
        >
          <p className="whitespace-pre-wrap">{msg.text}</p>
        </div>
        {isUser && (
          <div className="shrink-0 w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="currentColor"
              className="w-6 h-6 text-gray-600 dark:text-gray-300"
            >
              <path d="M480-40 360-160H200q-33 0-56.5-23.5T120-240v-560q0-33 23.5-56.5T200-880h560q33 0 56.5 23.5T840-800v560q0 33-23.5 56.5T760-160H600L480-40ZM200-286q54-53 125.5-83.5T480-400q83 0 154.5 30.5T760-286v-514H200v514Zm280-194q58 0 99-41t41-99q0-58-41-99t-99-41q-58 0-99 41t-41 99q0 58 41 99t99 41ZM280-240h400v-10q-42-35-93-52.5T480-320q-56 0-107 17.5T280-250v10Zm200-320q-25 0-42.5-17.5T420-620q0-25 17.5-42.5T480-680q25 0 42.5 17.5T540-620q0 25-17.5 42.5T480-560Zm0 17Z" />
            </svg>
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto p-2 sm:p-4">
      <img src="./ITESCALOGO.png" alt="" width={100}  className="absolute"/>

      <header className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white inline-flex items-center gap-2">
          Mi Asistente
          <img src="./ISCLOGO.png" alt="" width={48} />
        </h1>
      </header>

      <main ref={chatContainerRef} className="grow p-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <MessageBubble key={index} msg={msg} />
        ))}

        {messages.length === 1 && !isLoading && (
          <div className="flex flex-col items-center gap-2 my-4 animate-fade-in">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              O inicia con una pregunta común:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() =>
                  handleSuggestionClick(
                    "Hablame sobre las especialidades de la carrera"
                  )
                }
                className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-full hover:bg-gray-900 hover:text-white dark:bg-gray-800 dark:text-blue-400 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Oferta de Especialidades
              </button>
              <button
                onClick={() =>
                  handleSuggestionClick(
                    "¿Cuáles son las oportunidades laborales que hay en la carrera?"
                  )
                }
                className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-full hover:bg-gray-900 hover:text-white dark:bg-gray-800 dark:text-blue-400 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Oportunidades Laborales
              </button>
              <button
                onClick={() =>
                  handleSuggestionClick("¿Cuál es el proceso de admisión?")
                }
                className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-full hover:bg-gray-900 hover:text-white dark:bg-gray-800 dark:text-blue-400 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Proceso de Admisión
              </button>
            </div>
          </div>
        )}

        {isLoading && messages.length > 1 && (
          <div className="flex items-start gap-3 my-4 justify-start">
            <div className="shrink-0 w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="currentColor"
                className="w-6 h-6 text-gray-600 dark:text-gray-300"
              >
                <path d="M480-40q-23 0-46-3t-46-8Q300 14 194.5-4.5T33-117q-45-74-29-159t77-143v-3Q19-479 4-562.5T32-720q37-63 102-95.5T271-838q32-57 87.5-89.5T480-960q66 0 121.5 32.5T689-838q72-10 137 22.5T928-720q43 74 28 157.5T879-422v3q61 58 77 143t-29 159Q871-23 765.5-4.5T572-51q-23 5-46 8t-46 3ZM288-90q-32-18-61-41.5T174-183q-24-28-42.5-60.5T101-311q-20 36-20 76.5t21 75.5q29 48 81.5 68.5T288-90Zm384 0q52 20 104.5-.5T858-159q21-35 21-75.5T859-311q-12 35-30.5 67.5T786-183q-24 28-52.5 51.5T672-90Zm-192-30q134 0 227-93t93-227q0-29-4.5-55.5T782-547q-29 20-64 31t-73 11q-102 0-173.5-71.5T400-750q-104 26-172 112t-68 198q0 134 93 227t227 93ZM360-350q-21 0-35.5-14.5T310-400q0-21 14.5-35.5T360-450q21 0 35.5 14.5T410-400q0 21-14.5 35.5T360-350Zm240 0q-21 0-35.5-14.5T550-400q0-21 14.5-35.5T600-450q21 0 35.5 14.5T650-400q0 21-14.5 35.5T600-350ZM94-544q9-33 23-63.5t33-57.5q19-27 41.5-51t48.5-44q-43 0-79.5 21T102-681q-20 32-22 67t14 70Zm772 0q16-35 14-70t-22-67q-22-37-58.5-58T720-760q26 20 48.5 44t41.5 51q19 27 33 57.5t23 63.5Zm-221-41q29 0 54-9t46-25q-21-32-50-57.5T632-721q-34-19-72-29t-80-10v10q0 69 48 117t117 48Zm-54-239q-20-26-49-41t-62-15q-33 0-62 15t-49 41q26-8 54-12t57-4q29 0 57 4t54 12ZM150-665Zm660 0Zm-330-85Zm0-90ZM174-183Zm612 0Z" />
              </svg>
            </div>
            <div className="max-w-xs px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl shadow-md rounded-bl-lg flex items-center space-x-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></span>
            </div>
          </div>
        )}
      </main>

      <footer className="p-2 sm:p-4 border-t border-gray-200 dark:border-gray-700">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 sm:gap-4"
        >
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={
              isLoading
                ? "Esperando respuesta..."
                : "Pregunta sobre la carrera de Sistemas Computacionales..."
            }
            className="grow w-full px-4 py-3 text-gray-800 bg-gray-200 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-800 dark:text-white dark:focus:ring-gray-900"
            disabled={isLoading || !chatSession}
          />
          <button
            type="submit"
            disabled={isLoading || !userInput.trim() || !chatSession}
            className="shrink-0 p-3 text-white rounded-full bg-gray-900 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed dark:focus:ring-offset-gray-900 transition-colors"
            aria-label="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z" />
            </svg>
          </button>
        </form>
        {error && (
          <p className="mt-2 text-sm text-center text-red-500">{error}</p>
        )}
      </footer>
    </div>
  );
}

export default App;
