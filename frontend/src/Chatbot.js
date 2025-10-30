import React, { useState, useEffect, useRef } from 'react';
import './Chatbot.css';

// --- NEW: Object containing personalized advice for different body parts ---
const nextStepsAdvice = {
  'DEFAULT': `
    1. **Consult a Professional:** See a qualified doctor for an accurate diagnosis.
    2. **Immobilize:** Try to keep the injured area still.
    3. **Manage Swelling:** Applying a cold pack can help.`,
  'WRIST': `
    1. **Consult a Professional:** It's crucial to see an orthopedic specialist.
    2. **Immobilize:** A temporary splint can help stabilize the wrist. Avoid moving your wrist or gripping objects.
    3. **Elevate:** Keep your hand elevated above your heart to reduce swelling.`,
  'FINGER': `
    1. **Consult a Professional:** See a doctor to ensure proper healing.
    2. **Buddy Taping:** You can gently tape the injured finger to an adjacent healthy finger to provide support.
    3. **Ice:** Apply a cold pack for 15-20 minutes at a time.`,
  'SHOULDER': `
    1. **Consult a Professional:** Shoulder injuries can be complex; see a specialist.
    2. **Immobilize:** Use a sling to keep your arm and shoulder from moving.
    3. **Do Not Lift:** Avoid lifting any heavy objects or reaching overhead.`,
  'ELBOW': `
    1. **Consult a Professional:** Elbow injuries require careful evaluation.
    2. **Immobilize:** Keep the arm stable in a comfortable position, possibly with a sling.
    3. **Ice:** Apply a cold pack to the area to help with swelling and pain.`
};

// Chat bubble icon (SVG)
const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="30px" height="30px">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 12H5v-2h14v2zm0-3H5V9h14v2zm0-3H5V6h14v2z"/>
  </svg>
);

const Chatbot = ({ bodyPart, confidence }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [manualLocation, setManualLocation] = useState('');
  const [conversationState, setConversationState] = useState('initial');
  
  // --- IMPROVEMENT: Load messages from sessionStorage or start fresh ---
  const [messages, setMessages] = useState(() => {
    const savedMessages = sessionStorage.getItem('chatMessages');
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
  
  const messagesEndRef = useRef(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // --- IMPROVEMENT: Save messages to sessionStorage on change ---
  useEffect(() => {
    sessionStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  // Initial greeting message, now with confidence-aware language
  useEffect(() => {
    // Only show greeting if the chat is empty
    if (messages.length === 0) {
      const confidenceText = confidence > 0.85 
        ? "I've detected a likely fracture" 
        : "I've detected a potential fracture";
      
      addMessage(`${confidenceText} in the ${bodyPart} area. I can help with the next steps.`, 'bot');
      setTimeout(() => addMessage('What would you like to do?', 'bot', 'initial_choice'), 750);
    }
  }, [bodyPart, confidence, messages.length]);

  const toggleChat = () => setIsOpen(!isOpen);

  // --- IMPROVEMENT: New addMessage function with a "typing" indicator ---
  const addMessage = (text, sender, type = null, isMarkdown = false, link = null) => {
    if (sender === 'bot') {
      const typingMessage = { text: 'Typing...', sender: 'bot', type: 'typing' };
      setMessages(prev => [...prev, typingMessage]);
      
      setTimeout(() => {
        setMessages(prev => [...prev.slice(0, -1), { text, sender, type, isMarkdown, link }]);
      }, 750);
    } else {
      setMessages(prev => [...prev, { text, sender, type, isMarkdown, link }]);
    }
  };

  const handleChoice = (choice) => {
    if (choice === 'find_doctor') {
      addMessage('Find a nearby doctor.', 'user');
      setConversationState('awaiting_location_method');
      addMessage('To find a specialist, you can share your location automatically or type a location (like a city or zip code) below.', 'bot', 'location_choice');
    } else if (choice === 'next_steps') {
      addMessage('What are the next steps?', 'user');
      setConversationState('showing_results');
      
      // --- IMPROVEMENT: Get personalized advice ---
      const specificAdvice = nextStepsAdvice[bodyPart] || nextStepsAdvice['DEFAULT'];
      const fullMessage = `**General Advice for a ${bodyPart} Injury:**<br>${specificAdvice}<br><br><strong>Disclaimer:</strong> I am an AI assistant and not a medical professional. This is not a substitute for professional medical advice.`;
      
      addMessage(fullMessage, 'bot', null, true);
    }
  };

  const handleLocationMethod = (method, locationData = '') => {
    setConversationState('showing_results');
    let userMessageText = '';
    let mapsUrl = '';

    if (method === 'auto') {
      userMessageText = 'Share my current location.';
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            mapsUrl = `https://www.google.com/maps/search/orthopedic+doctor/@${latitude},${longitude},14z`;
            addMessage("Great! Here is a link showing specialists near you.", 'bot', 'maps_link', false, mapsUrl);
          },
          (error) => {
            console.error("Geolocation error:", error);
            addMessage("I couldn't get your location. Please ensure location services are enabled or try searching manually.", 'bot');
          }
        );
      } else {
        addMessage("Sorry, your browser doesn't support location services. Please enter a location manually.", 'bot');
      }
    } else if (method === 'manual') {
      if (!locationData.trim()) return;
      userMessageText = `Find a doctor near: ${locationData}`;
      const encodedLocation = encodeURIComponent(`orthopedic doctor in ${locationData}`);
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
      addMessage(`Okay, here are the results for "${locationData}".`, 'bot', 'maps_link', false, mapsUrl);
    }
    
    addMessage(userMessageText, 'user');
  };

  return (
    <>
      <div className={`chat-bubble ${isOpen ? 'open' : ''}`} onClick={toggleChat}>
        <ChatIcon />
      </div>
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <h3>AI Medical Assistant</h3>
            <button className="close-btn" onClick={toggleChat}>×</button>
          </div>
          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender} ${msg.type === 'typing' ? 'typing' : ''}`}>
                {msg.isMarkdown ? (
                  <p dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                ) : (
                  <p>{msg.text}</p>
                )}
                {msg.type === 'initial_choice' && conversationState === 'initial' && (
                  <div className="choice-options">
                    <button className="choice-btn" onClick={() => handleChoice('find_doctor')}>Find a Doctor</button>
                    <button className="choice-btn" onClick={() => handleChoice('next_steps')}>What should I do next?</button>
                  </div>
                )}
                {msg.type === 'location_choice' && conversationState === 'awaiting_location_method' && (
                  <div className="location-options">
                    <button className="location-btn" onClick={() => handleLocationMethod('auto')}>Share My Location</button>
                    <form className="location-form" onSubmit={(e) => { e.preventDefault(); handleLocationMethod('manual', manualLocation); }}>
                      <input type="text" className="location-input" placeholder="e.g., Chicago, IL" value={manualLocation} onChange={(e) => setManualLocation(e.target.value)} />
                      <button type="submit" className="search-btn">Search</button>
                    </form>
                  </div>
                )}
                {msg.type === 'maps_link' && (
                  <a href={msg.link} target="_blank" rel="noopener noreferrer" className="maps-link">Open Google Maps</a>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;