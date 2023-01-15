import { useEffect, useState, useRef, useMemo, useLayoutEffect } from "react";
import "./App.css";
import {
  HubConnectionBuilder,
  LogLevel,
  HubConnection,
  HubConnectionState,
  HttpTransportType,
} from "@microsoft/signalr";

import { Button, TextField, Box } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

interface Room {
  roomId: string;
  name: string;
  hostConnectionId: string;
}
function App() {
  const [groupName, setGroupName] = useState<String | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<String>("");
  let currentRoom = useRef<Room | null>(null);
  const [rooms, setRooms] = useState<Array<Room> | []>([]);
  let connection = useRef<HubConnection>();
  let peerConnection = useRef<RTCPeerConnection | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[] | []>([]);

  const [message, setMessage] = useState<string>("");

  const [recievedMessage, setRecievedMessage] = useState<string>("");

  let isInitiator = useRef<Boolean>(false);

  let dataChannel = useRef<RTCDataChannel | undefined>();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoRef2 = useRef<HTMLVideoElement | null>(null);

  const columns = useMemo<GridColDef[]>(
    () => [
      { field: "roomId", headerName: "Room Id", width: 300 },
      { field: "name", headerName: "Room Name", width: 200 },
      {
        field: "hostConnectionId",
        headerName: "Host Connection Id",
        width: 300,
      },
      {
        field: "delete",
        headerName: "Delete",
        renderCell: (params) => (
          <Button
            // disabled={params.row.hostConnectionId!==connection.current?.connectionId} // disabled if not hoster

            color="error"
            size="large"
            style={{ width: "100%", height: "100%" }}
            onClick={() => onDeleteClick(params.row)}
          >
            Delete
          </Button>
        ),
      },
      {
        field: "join",
        headerName: "Join",
        renderCell: (params) => (
          <Button
            disabled={params.row.roomId === currentRoom.current?.roomId} // disable joined group
            size="large"
            style={{ width: "100%", height: "100%" }}
            onClick={() => onJoinClick(params.row)}
          >
            Join
          </Button>
        ),
      },
    ],
    [currentRoom, connection]
  );

  useLayoutEffect(() => {
    peerConnection.current = new RTCPeerConnection({
      iceServers: [
        {
          urls: "turn:numb.viagenie.ca",
          credential: "muazkh",
          username: "webrtc@live.com",
        },
      ],
    });
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((stream) => {
        videoRef.current!.srcObject = stream;
        stream.getTracks().forEach((track) => {
          peerConnection.current?.addTrack(track, stream);
        });
        setStream(stream);
      })
      .catch((error) => {
        console.error("Error accessing media devices.", error);
      })
      .finally(() => {
        getDevices();
      });
  }, []);
  useLayoutEffect(() => {
    connection.current = new HubConnectionBuilder()
      .configureLogging(LogLevel.Debug)
      .withUrl("/hubs/WebRTCHub", {
        withCredentials: true,
        headers: { "Feature-Policy": "microphone 'self'; camera 'self'" },
      })
      .build();

    connection.current
      .start()
      .then(() => {
        connection.current!.on("created", (room) => {
          currentRoom.current = room;
          isInitiator.current = true;
          setConnectionStatus("You created room " + room.name);
        });

        connection.current!.on("roomUpdate", (rooms) => {
          setRooms(rooms);
        });
        connection.current!.on("joined", (roomId) => {
          isInitiator.current = false;
        });

        connection.current!.invoke("GetRooms").catch((err) => {
          console.log(err);
        });

        connection.current!.on("ready", () => {
          console.log("ready");
          setConnectionStatus("Connecting..");
          createPeerConnection(isInitiator.current);
        });
        connection.current!.on("message", (message) => {
          console.log("Client received message:", message);
          signalingMessageCallback(message);
        });
      })
      .catch((err) => console.log(err));
  }, []);

  const signalingMessageCallback = (message: any) => {
    if (message.type === "offer") {
      console.log("Got offer. Sending answer to peer.");
      peerConnection.current?.setRemoteDescription(
        new RTCSessionDescription(message)
      );
      peerConnection.current
        ?.createAnswer()
        .then((value) => {
          onLocalSessionCreated(value);
        })
        .catch((err) => console.log(err));
    } else if (message.type === "answer") {
      console.log("Got answer.");
      peerConnection.current?.setRemoteDescription(
        new RTCSessionDescription(message)
      );
    } else if (message.type === "candidate") {
      console.log("Candidate");
      peerConnection.current?.addIceCandidate(
        new RTCIceCandidate({
          candidate: message.candidate,
        })
      );
    }
  };

  const createPeerConnection = (isInitiator: Boolean) => {
    // send any ice candidates to the other peer
    peerConnection.current!.onicecandidate = (event) => {
      console.log("icecandidate event:", event);
      if (event.candidate) {
        // Trickle ICE
        //sendMessage({
        //    type: 'candidate',
        //    label: event.candidate.sdpMLineIndex,
        //    id: event.candidate.sdpMid,
        //    candidate: event.candidate.candidate
        //});
      } else {
        console.log("End of candidates.");
        // Vanilla ICE
        sendMessage(peerConnection.current!.localDescription);
      }
    };
    peerConnection.current!.ontrack = function (event) {
      console.log("icecandidate ontrack event:", event);
      videoRef2.current!.srcObject = event.streams[0];
    };
    if (isInitiator) {
      console.log("Creating Data Channel");
      dataChannel.current =
        peerConnection.current?.createDataChannel("sendDataChannel");
      onDataChannelCreated(dataChannel.current);

      console.log("Creating an offer");
      peerConnection
        .current!.createOffer()
        .then((value) => {
          onLocalSessionCreated(value);
        })
        .catch((err) => console.log(err));
    } else {
      peerConnection.current!.addEventListener("datachannel", (event) => {
        console.log("ondatachannel:", event.channel);
        dataChannel.current = event.channel;
        onDataChannelCreated(dataChannel.current);
      });
    }
  };

  const onLocalSessionCreated = (desc: RTCSessionDescriptionInit) => {
    console.log("local session created:", desc);
    peerConnection.current!.setLocalDescription(desc);
  };

  const onDataChannelCreated = (channel: any) => {
    console.log("onDataChannelCreated:", channel);

    channel.onopen = () => {
      console.log("Channel opened!!!");
      setConnectionStatus("Channel opened!!");
    };

    channel.onclose = () => {
      console.log("Channel closed.");
      setConnectionStatus("Channel closed.");
    };

    channel.onmessage = (event: any) => {
      setRecievedMessage(event.data);
    };
  };

  const sendMessage = (message: RTCSessionDescription | null) => {
    connection
      .current!.invoke("SendMessage", currentRoom.current?.roomId, message)
      .catch((err) => {
        console.log(err);
      });
  };

  useEffect(() => {
    const unloadCallback = () => {
      if (currentRoom) {
        connection
          .current!.invoke("LeaveRoom", currentRoom.current?.roomId)
          .catch((err) => {
            console.log(err);
          });
      }
    };
    window.addEventListener("unload", unloadCallback);

    return () => window.removeEventListener("unload", unloadCallback);
  }, []);

  const getDevices = () => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setDevices(
        devices.filter(
          (device) =>
            device.kind === "audioinput" || device.kind === "videoinput"
        )
      );
    });
  };

  useEffect(() => {
    const deviceChangeCallback = (event: any) => {
      getDevices();
    };
    navigator.mediaDevices.addEventListener(
      "devicechange",
      deviceChangeCallback
    );

    return () =>
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        deviceChangeCallback
      );
  }, []);

  const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGroupName(e.target.value);
  };
  const onCreateRoom = () => {
    if (
      connection.current?.state == HubConnectionState.Connected &&
      groupName &&
      groupName!.trim().length > 0
    ) {
      connection.current
        ?.invoke("CreateRoom", groupName)
        .then(() => {
          setGroupName("");
        })
        .catch((err) => console.log(err));
    }
  };
  const onJoinClick = (room: Room) => {
    if (connection.current?.state == HubConnectionState.Connected) {
      connection.current
        ?.invoke("JoinRoom", room.roomId)
        .then(() => {
          currentRoom.current = room;
          setConnectionStatus("You joined room " + room.name);
        })
        .catch((err) => console.log(err));
    }
  };
  const onLeaveRoom = (room: Room | null) => {
    if (connection.current?.state == HubConnectionState.Connected && room) {
      connection.current
        ?.invoke("LeaveRoom", room.roomId)
        .then(() => {
          currentRoom.current = null;
          peerConnection.current?.close();
          setConnectionStatus("You left room " + room.name);
        })
        .catch((err) => console.log(err));
    }
  };
  const onDeleteClick = async (row: Room) => {
    if (connection.current?.state == HubConnectionState.Connected) {
      if (currentRoom.current?.roomId == row.roomId) {
        await connection.current
          ?.invoke("LeaveRoom", currentRoom.current.roomId)
          .then(() => {
            currentRoom.current = null;
            setConnectionStatus("You left room " + row.name);
          })
          .catch((err) => console.log(err));
      }
      connection.current
        ?.invoke("DeleteRoom", row.roomId)
        .then(() => {
          setConnectionStatus("You deleted room " + row.name);
        })
        .catch((err) => console.log(err));
    }
  };

  const onMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const onMessageSend = () => {
    if (!message) {
      return;
    }
    dataChannel.current?.send(message);
    setMessage("");
  };

  return (
    <div className="App">
      <Box>
        <TextField
          size="small"
          label="Name"
          value={groupName}
          onChange={onNameChange}
          style={{ marginRight: 8 }}
        />
        <Button
          style={{ marginRight: 8 }}
          onClick={onCreateRoom}
          variant="contained"
        >
          Create Room
        </Button>
        <Button
          disabled={currentRoom == null}
          onClick={() => onLeaveRoom(currentRoom.current)}
          color="error"
          variant="contained"
        >
          Leave Room
        </Button>
      </Box>
      <Box>
        {connection.current?.state} | {connectionStatus}
      </Box>
      {/* <Box>
        {devices.map((device) => (
          <Box>
            {device.kind}: {device.label}
          </Box>
        ))}
      </Box> */}
      <Box style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <video
          style={{ transform: "rotateY(180deg)" }}
          autoPlay
          width={400}
          height={300}
          ref={videoRef}
          playsInline
        ></video>
        <video
          style={{ transform: "rotateY(180deg)" }}
          autoPlay
          width={400}
          height={300}
          ref={videoRef2}
          playsInline
        ></video>
      </Box>
      <Box
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 8,
          alignItems: "center",
        }}
      >
        <TextField
          size="small"
          label="Message"
          onChange={onMessageChange}
          value={message}
        />
        <Button
          style={{ marginRight: 8 }}
          onClick={onMessageSend}
          variant="contained"
        >
          Send
        </Button>
        <Box>Recieved message: {recievedMessage}</Box>
      </Box>
      <div style={{ height: 560, width: "100%" }}>
        <DataGrid
          rows={rooms}
          columns={columns}
          pageSize={10}
          getRowId={(row) => row.roomId}
          rowsPerPageOptions={[5]}
          isRowSelectable={() => false}
          getRowClassName={(props) =>
            props.id == currentRoom.current?.roomId ? "highlight-row" : ""
          }
        />
      </div>
    </div>
  );
}

export default App;
