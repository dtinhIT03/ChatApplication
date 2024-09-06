import React, { useState, useEffect } from "react";
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let stompClient = null;
const ChatRoom = () => {
  const [privateChats, setPrivateChats] = useState(new Map());
  const [publicChats, setPublicChats] = useState([]);
  const [tab,setTab] = useState("CHATROOM");
  const [userData, setUserData] = useState({
    username: "",
    receivername: "",
    connected: false,
    message: ""
  });

  useEffect(() => {
    console.log(userData);
  }, [userData]);

  const registerUser = () => {
    stompClient = new Client({
        webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
        reconnectDelay: 5000,
        onConnect: onConnected
      });
    stompClient.activate(); 
  }

  const onConnected = () => {
    setUserData({...userData, "connected" : true});
    console.log(userData.username)
    stompClient.subscribe('/topic/public',onReceiveMessage);
    stompClient.subscribe('/user/'+userData.username+'/private', onPrivateMessage);
    Join();
  }

  const onPrivateMessage = (payload) => {
    const payloadData = JSON.parse(payload.body);
    if(!privateChats.get(payloadData.sender)) {
        privateChats.set(payloadData.sender,[])
    }
        privateChats.get(payloadData.sender).push(payloadData)
        setPrivateChats(new Map(privateChats))
    
}
const sendPrivateValue = () => {
    if (stompClient) {
        const chatMessage = {
            type: 'CHAT',
            sender: userData.username,
            content : userData.message,
            customer : tab,
        }
        if(userData.username !== tab) {
            privateChats.get(tab).push(chatMessage)
            setPrivateChats(new Map(privateChats))
        }

        stompClient.publish({destination : "/app/chat.private" ,body : JSON.stringify(chatMessage)})
        setUserData({...userData,message: ''})
    }
}

  const Join = () =>{
    const chatMessage = {
      sender : userData.username,
      type : 'JOIN'
    }
    stompClient.publish({destination: "/app/chat.addUser", body: JSON.stringify(chatMessage)});
  }

  const onReceiveMessage = (payload) => {
    const payloadData = JSON.parse(payload.body);
    console.log(payloadData)
    switch(payloadData.type) {
        case 'JOIN':
            payloadData.content = payloadData.sender + ' joined';
            setPublicChats(prevChats =>[...prevChats,payloadData])
            if(userData.username != payloadData.sender) {
            setPrivateChats(prevChats => new Map(prevChats.set(payloadData.sender,[])))
            }
            break;
        case 'CHAT' :
            setPublicChats(prevChats =>[...prevChats,payloadData])
            break;    
        default:
            break;
    }
  }

  const sendValue = () => {
    if (stompClient) {
        const chatMessage = {
            sender : userData.username,
            content : userData.message,
            type : 'CHAT',
            customer : tab,
            
        }
        stompClient.publish({destination: "/app/chat.sendMessage"
            , body: JSON.stringify(chatMessage)})
        userData.message='';
    }
}

const handleUsername = (event) => {
    const {value} = event.target;
    setUserData({...userData, "username" :value})
}

const handleMessage = (event) => {
    const {value} = event.target
    setUserData({...userData, "message" :value})
}




  return (
    <div className="container">
        {userData.connected ?
        <div className="chat-box">
            <div className="member-list">
                <ul>
                    <li onClick={()=>{setTab("CHATROOM")}} className={`member ${tab==="CHATROOM" && "active"}`}>Chatroom</li>
                    {[...privateChats.keys()].map((name,index)=>(
                        <li onClick={()=>{setTab(name)}} className={`member ${tab===name && "active"}`} key={index}>{name}</li>
                    ))}
                </ul>
            </div>
            {tab==="CHATROOM" && <div className="chat-content">
                <ul className="chat-messages">
                    {publicChats.map((chat,index)=>(
                        <li className={`message ${chat.sender === userData.username && "self"}`} key={index}>
                            {chat.sender !== userData.username && <div className="avatar">{chat.sender}</div>}
                            <div className="message-data">{chat.content}</div>
                            {chat.sender === userData.username && <div className="avatar self">{chat.sender}</div>}
                        </li>
                    ))}
                </ul>

                <div className="send-message">
                    <input type="text" className="input-message" placeholder="enter the message" value={userData.message} onChange={handleMessage} /> 
                    <button type="button" className="send-button" onClick={sendValue}>send</button>
                </div>
            </div>}
            {tab!=="CHATROOM" && <div className="chat-content">
                <ul className="chat-messages">
                    {[...privateChats.get(tab)].map((chat,index)=>(
                        <li className={`message ${chat.sender === userData.username && "self"}`} key={index}>
                            {chat.sender !== userData.username && <div className="avatar">{chat.sender}</div>}
                            <div className="message-data">{chat.content}</div>
                            {chat.sender === userData.username && <div className="avatar self">{chat.sender}</div>}
                        </li>
                    ))}
                </ul>

                <div className="send-message">
                    <input type="text" className="input-message" placeholder="enter the message" value={userData.message} onChange={handleMessage} /> 
                    <button type="button" className="send-button" onClick={sendPrivateValue}>send</button>
                </div>
            </div>}
        </div>
        :
        <div className="register">
            <input
                id="user-name"
                placeholder="Enter your name"
                name="userName"
                value={userData.username}
                onChange={handleUsername}
                margin="normal"
              />
              <button type="button" onClick={registerUser}>
                    connect
              </button> 
        </div>}
    </div>
    );
}

export default ChatRoom;
