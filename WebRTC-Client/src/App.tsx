import { useEffect, useState, useRef } from "react";
import "./App.css";
import {
  HubConnectionBuilder,
  LogLevel,
  HubConnection,
  HubConnectionState,
} from "@microsoft/signalr";
import { Button, TextField } from "@mui/material";
function App() {
  const [name, setName] = useState<String>();
  const [message, setMessage] = useState<String>();
  let connection = useRef<HubConnection>();
  useEffect(() => {
    connection.current = new HubConnectionBuilder()
      .configureLogging(LogLevel.Debug)
      .withUrl("/hubs/WebRTCHub", { withCredentials: true })
      .build();
    connection.current
      .start()
      .then(() => {
        console.log("connectionId", connection.current?.connectionId);
        connection.current?.on("ReceiveMessage", (user, message) => {
          console.log(user, message);
        });
      })
      .catch((err) => console.log(err));
  }, []);
  const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };
  const onMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };
  const onSendMessage = () => {
    console.log(connection.current?.state);
    if (connection.current?.state == HubConnectionState.Connected) {
      connection.current
        ?.invoke("SendMessage", name, message)
        .catch((err) => console.log(err));
    }
  };
  return (
    <div className="App">
      <TextField label="Name" value={name} onChange={onNameChange} />
      <TextField label="Message" value={message} onChange={onMessageChange} />
      <Button onClick={onSendMessage} variant="contained">
        Send Message
      </Button>
    </div>
  );
}

export default App;
