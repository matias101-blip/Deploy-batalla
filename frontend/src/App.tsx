import React, { useState, useEffect, useRef } from 'react';
import { Container, Button, Form, Header, Grid, Image, Progress } from 'semantic-ui-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faUser } from '@fortawesome/free-solid-svg-icons';
import io from 'socket.io-client';
import { format } from 'date-fns';
import './App.css';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';


const Gv_socket = io('http://0.0.0.0:80');

interface ClsMensaje {
  Lv_nombreUsuario: string;
  Lv_mensaje: string;
  Lv_marcaDeTiempo: Date;
}

interface ClsJugador {
  Ln_id: string;
  Lv_nombre: string;
  Lb_esCreador: boolean;
  Ln_puntaje: number;
}

const Cls_LluviaMatrix = () => {
  const Lv_canvasRef = useRef<HTMLCanvasElement>(null);
  const Lv_dropsRef = useRef<number[]>([]);

  useEffect(() => {
    const Lv_canvas = Lv_canvasRef.current;
    if (!Lv_canvas) return;
    const Lv_ctx = Lv_canvas.getContext('2d');
    if (!Lv_ctx) return;

    Lv_canvas.width = window.innerWidth;
    Lv_canvas.height = window.innerHeight;

    const Gv_signosPregunta = '?';
    const Ln_tamañoFuente = 20;
    const Ln_columnas = Math.floor(Lv_canvas.width / Ln_tamañoFuente);
    const Gv_colores = ['#0F0', '#FF0', '#F00', '#0FF', '#F0F', '#00F', '#FFF'];
    Lv_dropsRef.current = Array(Ln_columnas).fill(1);

    const Cls_dibujar = () => {
      Lv_ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      Lv_ctx.fillRect(0, 0, Lv_canvas.width, Lv_canvas.height);
      Lv_ctx.font = `${Ln_tamañoFuente}px monospace`;

      for (let Ln_i = 0; Ln_i < Lv_dropsRef.current.length; Ln_i++) {
        const Lv_colorAleatorio = Gv_colores[Math.floor(Math.random() * Gv_colores.length)];
        Lv_ctx.fillStyle = Lv_colorAleatorio;
        const Lv_texto = Gv_signosPregunta[Math.floor(Math.random() * Gv_signosPregunta.length)];
        Lv_ctx.fillText(Lv_texto, Ln_i * Ln_tamañoFuente, Lv_dropsRef.current[Ln_i] * Ln_tamañoFuente);

        if (Lv_dropsRef.current[Ln_i] * Ln_tamañoFuente > Lv_canvas.height && Math.random() > 0.975) {
          Lv_dropsRef.current[Ln_i] = 0;
        }
        Lv_dropsRef.current[Ln_i]++;
      }
    };

    const Lv_intervalo = setInterval(Cls_dibujar, 33);
    return () => clearInterval(Lv_intervalo);
  }, []);

  return <canvas ref={Lv_canvasRef} className="matrix-rain" />;
};


function ClsApp() {
  const [Lv_nombreUsuario, Lv_setNombreUsuario] = useState<string>('');
  const [Lv_sala, Lv_setSala] = useState<string>('');
  const [Lb_mostrarBienvenida, Lb_setMostrarBienvenida] = useState<boolean>(true);
  const [Lb_mostrarUnirseASala, Lb_setMostrarUnirseASala] = useState<boolean>(false);
  const [Lb_mostrarChat, Lb_setMostrarChat] = useState<boolean>(false);
  const [Lb_mostrarJuego, Lb_setMostrarJuego] = useState<boolean>(false);
  const [Ln_jugadores, Lv_setJugadores] = useState<ClsJugador[]>([]);
  const [Ln_mensajes, Lv_setMensajes] = useState<ClsMensaje[]>([]);
  const [Lv_mensajeActual, Lv_setMensajeActual] = useState<string>('');
  const [Lb_esCreador, Lv_setEsCreador] = useState<boolean>(false);
  const [Lv_pregunta, Lv_setPregunta] = useState<string>('');
  const [Lv_opciones, Lv_setOpciones] = useState<string[]>([]);
  const [Ln_segundos, Lv_setSegundos] = useState<number>(10);
  const [Lv_ganadores, Lv_setGanadores] = useState<string[] | null>(null);
  const [Lb_esEmpate, Lv_setEsEmpate] = useState<boolean>(false);
  const [Ln_indiceRespuestaSeleccionada, Lv_setIndiceRespuestaSeleccionada] = useState<number | null>(null);
  const [Lb_respondido, Lv_setRespondido] = useState<boolean>(false);
  const [Lv_imagen, Lv_setImagen] = useState<string>('');
  const [Lv_categoria, Lv_setCategoria] = useState<string>('');
  const [Lv_mensajeError, Lv_setMensajeError] = useState<string>('');
  const [Lv_resultadoRespuesta, Lv_setResultadoRespuesta] = useState<{ Lb_esCorrecto: boolean; Lv_mensaje: string } | null>(null);
  const [Ln_totalPreguntas, Lv_setTotalPreguntas] = useState<number>(30);
  const [Ln_numeroPreguntaActual, Lv_setNumeroPreguntaActual] = useState<number>(0);
  const [mensajeImportante, setMensajeImportante] = useState<{ tipo: string; mensaje: string } | null>(null);

  const Lv_chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Gv_socket.on('salaUnida', (Lv_datos: { jugadores: ClsJugador[], Lb_esCreador: boolean }) => {
      Lv_setJugadores(Lv_datos.jugadores);
      Lv_setEsCreador(Lv_datos.Lb_esCreador);
      Lb_setMostrarUnirseASala(false);
      Lb_setMostrarChat(true);
      Lv_setMensajeError('');
    });

    Gv_socket.on('nombreUsuarioExistente', (Lv_mensaje: string) => {
      Lv_setMensajeError(Lv_mensaje);
    });

    Gv_socket.on('mensajeImportante', (datos: { tipo: string; mensaje: string }) => {
      setMensajeImportante(datos);
      setTimeout(() => setMensajeImportante(null), 5000);
      reiniciarABienvenida();});

    Gv_socket.on('salaNoEncontrada', () => {
      Lv_setMensajeError('Esa sala no está creada');
    });

    Gv_socket.on('salaYaExiste', () => {
      Lv_setMensajeError('Esa sala ya existe. Por favor, elige otro ID.');
    });

    Gv_socket.on('jugadorUnido', (Lv_jugadoresActualizados: ClsJugador[]) => {
      Lv_setJugadores(Lv_jugadoresActualizados);
    });

    Gv_socket.on('jugadorSalio', (Lv_jugadoresActualizados: ClsJugador[]) => {
      Lv_setJugadores(Lv_jugadoresActualizados);
    });

    Gv_socket.on('mensajeChat', (Lv_mensaje: ClsMensaje) => {
      Lv_setMensajes((Lv_mensajesAnteriores) => [...Lv_mensajesAnteriores, { ...Lv_mensaje, Lv_marcaDeTiempo: new Date() }]);
    });

    Gv_socket.on('juegoIniciado', () => {
      Lb_setMostrarChat(false);
      Lb_setMostrarJuego(true);
      reiniciarJuego();
    });

    Gv_socket.on('nuevaPregunta', (Lv_datos: { Lv_pregunta: string, Lv_respuestas: string[], Ln_temporizador: number, Lv_imagen?: string, Lv_nivel: string, Lv_categoria: string, Ln_numeroPregunta: number }) => {
      Lv_setPregunta(Lv_datos.Lv_pregunta);
      Lv_setOpciones(Lv_datos.Lv_respuestas);
      Lv_setSegundos(Lv_datos.Ln_temporizador); // Reinicia el temporizador
      Lv_setImagen(Lv_datos.Lv_imagen || '');
      Lv_setCategoria(Lv_datos.Lv_categoria);
      Lv_setRespondido(false);
      Lv_setIndiceRespuestaSeleccionada(null);
      Lv_setNumeroPreguntaActual(Lv_datos.Ln_numeroPregunta);
    });

    Gv_socket.on('actualizarPuntajes', (Lv_puntajesActualizados: ClsJugador[]) => {
      Lv_setJugadores(Lv_puntajesActualizados);
    });

    Gv_socket.on('finJuego', (Lv_datos: { Lv_ganadores: string[] | null, Lb_esEmpate: boolean, Lv_puntajes: ClsJugador[], Ln_totalPreguntas: number }) => {
      Lv_setGanadores(Lv_datos.Lv_ganadores);
      Lv_setEsEmpate(Lv_datos.Lb_esEmpate);
      Lv_setJugadores(Lv_datos.Lv_puntajes);
      Lv_setTotalPreguntas(Lv_datos.Ln_totalPreguntas);
      Lb_setMostrarJuego(false);
    });

    Gv_socket.on('resultadoRespuesta', (Lv_resultado: { Lb_esCorrecto: boolean; Lv_mensaje: string }) => {
      Lv_setResultadoRespuesta(Lv_resultado);
      setTimeout(() => Lv_setResultadoRespuesta(null), 2000);
    });

    Gv_socket.on('juegoEnProgreso', (Lv_mensaje: string) => {
      Lv_setMensajeError(Lv_mensaje);
    });

    Gv_socket.on('creadorSalio', (Lv_mensaje: string) => {
      alert(Lv_mensaje);
      reiniciarABienvenida();
    });

    Gv_socket.on('jugadoresInsuficientes', (Lv_mensaje: string) => {
      alert(Lv_mensaje);
    });

    return () => {
      Gv_socket.off('salaUnida');
      Gv_socket.off('salaNoEncontrada');
      Gv_socket.off('salaYaExiste');
      Gv_socket.off('jugadorUnido');
      Gv_socket.off('jugadorSalio');
      Gv_socket.off('mensajeChat');
      Gv_socket.off('juegoIniciado');
      Gv_socket.off('nuevaPregunta');
      Gv_socket.off('actualizarPuntajes');
      Gv_socket.off('finJuego');
      Gv_socket.off('resultadoRespuesta');
      Gv_socket.off('juegoEnProgreso');
      Gv_socket.off('creadorSalio');
      Gv_socket.off('jugadoresInsuficientes');
      Gv_socket.off('mensajeImportante');
      Gv_socket.off('nombreUsuarioExistente');
    };
  }, []);

  useEffect(() => {
    if (Lv_chatRef.current) {
      Lv_chatRef.current.scrollTop = Lv_chatRef.current.scrollHeight;
    }
  }, [Ln_mensajes]);

  const Lv_generarIdSala = () => {
    return Math.floor(Math.random() * 900) + 100;
  };

  useEffect(() => {
    if (Ln_segundos === 0) {
      // Tiempo agotado
      Lv_setRespondido(true);
      Gv_socket.emit('tiempoAgotado', { Lv_sala });
      return;
    }

    const Lv_timerInterval = setInterval(() => {
      Lv_setSegundos((prevTime) => (prevTime > 0 ? prevTime - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(Lv_timerInterval);
    };
  }, [Ln_segundos, Lv_sala]);

  const Lv_manejarCrearSala = () => {
    const Ln_nuevoIdSala = Lv_generarIdSala();
    Lv_setSala(Ln_nuevoIdSala.toString());
    Lb_setMostrarBienvenida(false);
    Lb_setMostrarUnirseASala(true);
    Lv_setEsCreador(true);
  };

  const reiniciarJuego = () => {
    Lv_setJugadores(Ln_jugadores.map(Lv_j => ({ ...Lv_j, Ln_puntaje: 0 })));
    Lv_setGanadores(null);
    Lv_setEsEmpate(false);
    Lv_setNumeroPreguntaActual(0);
    Lv_setRespondido(false);
    Lv_setIndiceRespuestaSeleccionada(null);
    Lv_setResultadoRespuesta(null);
  };

  const reiniciarABienvenida = () => {
    Lb_setMostrarBienvenida(true);
    Lb_setMostrarUnirseASala(false);
    Lb_setMostrarChat(false);
    Lb_setMostrarJuego(false);
    Lv_setEsCreador(false);
    Lv_setSala('');
    Lv_setNombreUsuario('');
    Lv_setMensajeError('');
    Lv_setMensajes([]);
    Lv_setJugadores([]);
    Lv_setGanadores(null);
    Lv_setEsEmpate(false);
  };

  const Lv_manejarUnirseASalaExistente = () => {
    Lb_setMostrarBienvenida(false);
    Lb_setMostrarUnirseASala(true);
    Lv_setEsCreador(false);
  };

  const Lv_manejarUnirseSala = () => {
    if (Lv_nombreUsuario && Lv_sala) {
      Lv_setMensajeError('');
      if (Lb_esCreador) {
        Gv_socket.emit('crearSala', { Lv_nombreUsuario, Lv_sala });
      } else {
        Gv_socket.emit('unirseSala', { Lv_nombreUsuario, Lv_sala });
      }
    } else {
      Lv_setMensajeError('Por favor, ingresa tu nombre y el ID de la sala');
    }
  };

  const Lv_enviarMensaje = (e: React.FormEvent) => {
    e.preventDefault();
    if (Lv_mensajeActual) {
      Gv_socket.emit('enviarMensaje', { Lv_sala, Lv_nombreUsuario, Lv_mensaje: Lv_mensajeActual });
      Lv_setMensajeActual('');
    }
  };

  const Lv_manejarIniciarJuego = () => {
    if (Ln_jugadores.length < 2) {
      alert('Se necesitan al menos 2 jugadores para iniciar el juego.');
      return;
    }
    Gv_socket.emit('iniciarJuego', Lv_sala);
    reiniciarJuego();
  };

  const Lv_manejarRespuesta = (Ln_indiceRespuesta: number) => {
    if (!Lb_respondido) {
      Lv_setIndiceRespuestaSeleccionada(Ln_indiceRespuesta);
      Gv_socket.emit('enviarRespuesta', { Lv_sala, Ln_indiceRespuesta });
      Lv_setRespondido(true);
      Lv_setSegundos(0); // Detiene el temporizador
    }
  };

  const Lv_manejarVolverAlChat = () => {
    Lb_setMostrarJuego(false);
    Lb_setMostrarChat(true);
    reiniciarJuego();
    Gv_socket.emit('volverAlChat', { Lv_sala });
  };

  const Lv_manejarVolverABienvenida = () => {
    Lb_setMostrarBienvenida(true);
    Lb_setMostrarUnirseASala(false);
    Lv_setEsCreador(false);
    Lv_setSala('');
    Lv_setNombreUsuario('');
    Lv_setMensajeError('');
  };

  const Lv_manejarSalirDeSala = () => {
    Gv_socket.emit('salirDeSala', { Lv_sala, Lv_nombreUsuario });
    reiniciarABienvenida();
  };

  return (
    <div className="app-container">
      <Cls_LluviaMatrix />
      {mensajeImportante && (
        <div className={`mensaje-importante ${mensajeImportante.tipo}`}>
        <p>{mensajeImportante.mensaje}</p>
        </div>
      )}
      {Lb_mostrarBienvenida ? (
        <Container className="welcome-container">
            <motion.h1
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8 }}
                  className="title"
                  >
                  Batalla Trivial
            </motion.h1>
            <div className="join-room-logo">
              <motion.img initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }} src="/signoico.png" alt="Batalla Trivial"/>
                        </div>
                  <motion.p
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="description">
                  Desafía tu mente en el universo de preguntas
                  </motion.p>
                    <div className="button-container">
                  <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                      className="join-btn"
                      onClick={Lv_manejarCrearSala}>
                      Crear Sala
                    </motion.button>
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="join-btn"
                    onClick={Lv_manejarUnirseASalaExistente}>
                    Entrar a la Sala
                  </motion.button>
              </div>
        </Container>
      ) : null}

      {Lb_mostrarUnirseASala && (
        <div className="join-div">
        <Container className="join-room-container">
          <h1 className="join-room-title">Batalla Trivial</h1>
          <div className="join-room-logo">
            <img src="/iconopag.webp" alt="Batalla Trivial"/>
            </div>
          {Lv_mensajeError && <div className="join-room-error">{Lv_mensajeError}</div>}
          <Form onSubmit={Lv_manejarUnirseSala} className="join-room-form">
            <Form.Input
              label="Ingresa tu nombre"
              placeholder="Tu nombre"
              value={Lv_nombreUsuario}
              onChange={(e) => Lv_setNombreUsuario(e.target.value)}
              className="join-room-input"
            />
            <Form.Input
              label="ID de la sala"
              placeholder="ID de la sala"
              value={Lv_sala}
              onChange={(e) => Lv_setSala(e.target.value)}
              readOnly={Lb_esCreador}
              className="join-room-input"
            />
            <button type="submit" className="join-room-submit">
              {Lb_esCreador ? 'Crear y Unirse' : 'Unirse'}
              <ArrowRight className="ml-2" size={20} />
            </button>
          </Form>
          <button onClick={Lv_manejarVolverABienvenida} className="join-room-back" >
          <ArrowLeft className="icon-left"/>
            Volver
          </button>
        </Container>
        </div>
      )}
      {Lb_mostrarChat && (
        <div className="chat-lobby">
        <Container fluid>
          <div className="chat-layout">
            <Grid stackable>
              <Grid.Column width={12} className="chat-main">
                <div className="chat-container">
                  <div className="chat-header">
                    <span>{`Lobby | Sala: ${Lv_sala}`}</span>
                  </div>
                  <div className="chat-messages" ref={Lv_chatRef}>
                    {Ln_mensajes.map((Lv_msg, index) => (
                      <div
                        key={index}
                        className={`message ${Lv_msg.Lv_nombreUsuario === Lv_nombreUsuario ? 'message-self' : 'message-other'}`}
                      >
                        <div className="message-content">{Lv_msg.Lv_mensaje}</div>
                        <div className="message-info">
                          {Lv_msg.Lv_nombreUsuario === Lv_nombreUsuario ? 'Yo' : Lv_msg.Lv_nombreUsuario} - {format(Lv_msg.Lv_marcaDeTiempo, 'HH:mm')}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="chat-input">
                    <Form onSubmit={Lv_enviarMensaje}>
                      <Form.Input
                        value={Lv_mensajeActual}
                        onChange={(e) => Lv_setMensajeActual(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        action={{
                          color: 'teal',
                          labelPosition: 'right',
                          icon: 'send',
                          content: 'Enviar',
                        }}
                      />
                    </Form>
                  </div>
                </div>
              </Grid.Column>
              <Grid.Column width={4} className="players-sidebar">
                <div className="players-card">
                  <div className="players-header">Jugadores en la Sala</div>
                  <div className="players-list">
                    {Ln_jugadores.map((Lv_jugador, index) => (
                      <div key={index} className="player-item">
                        <FontAwesomeIcon icon={faUser} /> {Lv_jugador.Lv_nombre}{' '}
                        {Lv_jugador.Lb_esCreador ? ( <img 
                          src="/corona.webp" 
                          alt="Creador" 
                          className="creador-icon white-icon"
                          style={{ width: '16px', height: '16px', verticalAlign: 'middle', marginLeft: '4px' }}
                        />) : null}
                      </div>
                    ))}
                  </div>
                  {Lb_esCreador && (
                    <div className="action-buttons">
                      <Button 
                        className="action-button start-game-button" 
                        onClick={Lv_manejarIniciarJuego} 
                        disabled={Ln_jugadores.length < 2}
                      >
                        Iniciar Juego
                      </Button>
                      {Ln_jugadores.length < 2 && (
                        <div className="warning-message">Se necesitan al menos 2 jugadores para iniciar el juego.</div>
                      )}
                    </div>
                  )}
                  <Button className="action-button leave-room-button" onClick={Lv_manejarSalirDeSala}>
                    Salir de la Sala
                  </Button>
                </div>
              </Grid.Column>
            </Grid>
            </div>
        </Container>
      </div>
      )}
        {Lb_mostrarJuego && (
        <div className="quiz-lobby">
          <Container fluid>
            <div className="quiz-layout">
                <Grid stackable>
                  <Grid.Column width={12} className="quiz-main">
                    <div className="quiz-container">
                      <div className="quiz-header">
                      <Header as="h1" style={{ color: '#38a169' }}>Batalla Trivial</Header>
                        <p>ID Sala: {Lv_sala}</p>
                      </div>
                      <div className="quiz-content">
                        <Progress value={Ln_numeroPreguntaActual}  total={10} progress="ratio" color="green" />
                        <div className="timer">
                          <p>
                            00:{Ln_segundos < 10 ? `0${Ln_segundos}` : Ln_segundos}{' '}
                            <FontAwesomeIcon icon={faClock} />
                          </p>
                        </div>
                        <p className="category-level">
                          Categoría: {Lv_categoria} 
                        </p>
                        <div className="question">
                          <p className="question-text">{Lv_pregunta}</p>
                        </div>
                        {Lv_imagen && <Image src={Lv_imagen} alt="Pregunta" className="question-image" />}
                        <ul className="options-list">
                          {Lv_opciones.map((Lv_opcion, index) => (
                            <li key={index}>
                              <button
                                className={`option ${Ln_indiceRespuestaSeleccionada === index ? 'selected' : ''}`}
                                onClick={() => Lv_manejarRespuesta(index)}
                                disabled={Lb_respondido}
                              >
                                {Lv_opcion}
                              </button>
                            </li>
                          ))}
                        </ul>
                        {Lv_resultadoRespuesta && (
                          <div
                              style={{
                                position: 'fixed',
                                top: '20px', 
                                left: '50%', 
                                transform: 'translateX(-50%)', 
                                padding: '10px 20px',
                                borderRadius: '8px',
                                backgroundColor: Lv_resultadoRespuesta.Lb_esCorrecto ? 'green' : 'red',
                                color: 'white',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                zIndex: 1000,
                                transition: 'opacity 0.5s',
                                opacity: Lv_resultadoRespuesta ? 1 : 0,
                              }}
                            >
                              {Lv_resultadoRespuesta.Lv_mensaje}
                          </div>
                        )}
                      </div>
                      </div>
                    </Grid.Column>
                    <Grid.Column width={4} className="players-sidebar">
                        <div className="players-card">
                          <div className="players-header">Puntajes</div>
                          <div className="players-list">
                            {Ln_jugadores.map((Lv_jugador, index) => (
                              <div key={index} className="player-item">
                                <FontAwesomeIcon icon={faUser} /> {Lv_jugador.Lv_nombre}: {Lv_jugador.Ln_puntaje}
                              </div>
                            ))}
                          </div>
                        </div>
                      </Grid.Column>
                  </Grid>
                </div>
            </Container>
        </div>
      )}
      {(Lv_ganadores !== null || Lb_esEmpate) && (
        <Container className="quiz-div">
          <Header as="h1" style={{ color: '#38a169' }}>
            {Lb_esEmpate
              ? 'Juego Terminado - Empate'
              : Lv_ganadores && Lv_ganadores.length > 0
              ? `${Lv_ganadores.join(' y ')} ${Lv_ganadores.length > 1 ? 'Han' : 'Ha'} Ganado`
              : 'Juego Terminado - Sin Ganador'}
          </Header>
              <p>Total de preguntas: {Ln_totalPreguntas}</p>
              <button className="join-btn" onClick={() => window.location.reload()}>
                Volver al Inicio
              </button>
              <button className="join-btn" onClick={Lv_manejarVolverAlChat} style={{ marginTop: '10px' }}>
                Volver al Chat
              </button>
              <div className="scores-container">
                <Header as="h2"  style={{ color: '#38a169' }}>Tabla de puntajes</Header>
                <div className="players-list">
                <div className="player-item">
                  {Ln_jugadores.map((Lv_jugador, index) => (
                    <p key={index}>
                      <FontAwesomeIcon icon={faUser} /> {Lv_jugador.Lv_nombre} : {Lv_jugador.Ln_puntaje}
                    </p>
                  ))}
                </div>
                </div>
                
        </div>
      </Container>

      )}
    </div>
  );
}

export default ClsApp;
