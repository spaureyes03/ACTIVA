import { useState, useEffect } from 'react'
import './App.css'
import { supabase } from './lib/supabase'


type Activation = {
  id: string
  name: string
  links: string[]
  createdAt: number
}

function App() {
  const [view, setView] = useState('home')


    const [session, setSession] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')


    useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])


  useEffect(() => {
    const loadActivations = async () => {
      if (!session?.user) {
        setActivations([])
        return
      }

      const { data, error } = await supabase
        .from('activations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error al cargar activaciones:', error)
        return
      }

      const now = Date.now()
      const fifteenDays = 15 * 24 * 60 * 60 * 1000

      const loadedActivations: Activation[] = (data || [])
        .map((activation: any) => ({
          id: activation.id,
          name: activation.name,
          links: activation.links,
          createdAt: new Date(activation.created_at).getTime()
        }))
        .filter(
          activation => now - activation.createdAt < fifteenDays
        )

      setActivations(loadedActivations)
    }

    loadActivations()
  }, [session])






    const handleLogin = async () => {
    setAuthError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setAuthError(error.message)
    }
  }


  const handleLogout = async () => {
  const { error } = await supabase.auth.signOut()

  if (error) {
    alert('No se pudo cerrar la sesión.')
  }
}




  const [name, setName] = useState('')
  const [linksText, setLinksText] = useState('')

  /*const [activations, setActivations] = useState<Activation[]>(() => {
  const savedActivations = localStorage.getItem('activa-activations')

  if (!savedActivations) return []

  try {
    const parsed = JSON.parse(savedActivations)
    const now = Date.now()
    const fifteenDays = 15 * 24 * 60 * 60 * 1000

    return parsed
      .map((activation: any) => ({
        ...activation,
        createdAt: activation.createdAt ?? now
      }))
      .filter(
        (activation: Activation) =>
          now - activation.createdAt < fifteenDays
      )
  } catch {
    return []
  }
})*/


const [activations, setActivations] = useState<Activation[]>([])





const today = new Date().toLocaleDateString()

const todayActivations = activations.filter(activation =>
  new Date(activation.createdAt).toLocaleDateString() === today
)

const historyActivations = activations.filter(activation =>
  new Date(activation.createdAt).toLocaleDateString() !== today
)



  /*Agregue*/
  const [selectedActivation, setSelectedActivation] = useState('')
const [selectedLink, setSelectedLink] = useState('')
const [description, setDescription] = useState('')

const [analysisLoading, setAnalysisLoading] = useState(false)
const [analysisError, setAnalysisError] = useState('')
const [analysisResult, setAnalysisResult] = useState<any>(null)

/*Add*/
const [institutionalAccounts, setInstitutionalAccounts] = useState('@Alejandro Armenta')
const [institutionalHashtags, setInstitutionalHashtags] = useState(
  '#TransformarEnGrande'
)
const [commentStyle, setCommentStyle] = useState('mixed')

const [generatedComments, setGeneratedComments] = useState<string[]>([])
const [copiedIndex, setCopiedIndex] = useState<number | null>(null)



const copyComment = async (comment: string, index: number) => {
  try {
    await navigator.clipboard.writeText(comment);
    setCopiedIndex(index);

    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  } catch (error) {
    console.error('Error al copiar:', error);
    alert('No se pudo copiar el comentario.');
  }
};







const currentActivation = activations.find(
  item => item.id === selectedActivation
)



/*Add*/

// Analizar automáticamente la publicación seleccionada
useEffect(() => {
  if (!selectedLink) {
    setAnalysisResult(null)
    setDescription('')
    setAnalysisError('')
    return
  }

  const analyzePublication = async () => {
    setAnalysisLoading(true)
    setAnalysisError('')
    setAnalysisResult(null)
    setDescription('')
    setGeneratedComments([])

    try {
      const response = await fetch(
        '/api/analyze-link',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: selectedLink })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo analizar la publicación.')
      }

      setAnalysisResult(data)
      setDescription(
        [data.title, data.description].filter(Boolean).join('. ')
      )

      if (!data.title && !data.description) {
        setAnalysisError(
          'La plataforma no proporcionó información de esta publicación.'
        )
      }

    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al analizar el enlace.'
      )
    } finally {
      setAnalysisLoading(false)
    }
  }

  analyzePublication()
}, [selectedLink])

/*add*/
const generateComments = () => {
  if (!description.trim()) return

  const topic = description.trim().replace(/[.!?]+$/, '')

  const accounts = institutionalAccounts
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(account => account.startsWith('@') ? account : `@${account}`)

  const hashtags = institutionalHashtags
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(tag => tag.startsWith('#') ? tag : `#${tag}`)

  const suggestedTags = [
    '#TransformarEnGrande'
  ]

  const mentionText = [...new Set(accounts)].join(' ')
  const tagText = [...new Set([...hashtags, ...suggestedTags])].join(' ')

  const proposals = [
    `¡Excelente iniciativa! 👏 Es muy valioso conocer más sobre ${topic}. ${mentionText} ${tagText}`,
    `Este tipo de actividades fortalecen nuestra comunidad y generan nuevas oportunidades de aprendizaje. ¡Muchas felicidades! ${mentionText} ${tagText}`,
    `¡Qué buena noticia! 🙌 Sigamos impulsando espacios que contribuyan al desarrollo de nuestra comunidad. ${mentionText} ${tagText}`,
    `Compartir estos logros nos motiva a seguir avanzando. ¡Enhorabuena por esta iniciativa! ${mentionText} ${tagText}`
  ]

  setGeneratedComments(proposals)
  setCopiedIndex(null)
}
/*Agregue hasta aqui*/



  const links = linksText
    .split(/\s+/)
    .map(link => link.trim())
    .filter(link => link.length > 0)

  const validLinks = links.filter(link => {
    try {
      const url = new URL(link)
      return url.protocol === 'https:' || url.protocol === 'http:'
    } catch {
      return false
    }
  })

/*
  const deleteActivation = (id: string) => {
  const confirmed = window.confirm(
    '¿Seguro que deseas eliminar esta activación y todos sus enlaces?'
  )

  if (!confirmed) return

  setActivations(previous =>
    previous.filter(activation => activation.id !== id)
  )
}*/




  const deleteActivation = async (id: string) => {
  const confirmed = window.confirm(
    '¿Seguro que deseas eliminar esta activación y todos sus enlaces?'
  )

  if (!confirmed) return

  const { error } = await supabase
    .from('activations')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error al eliminar activación:', error)
    alert('No se pudo eliminar la activación.')
    return
  }

  setActivations(previous =>
    previous.filter(activation => activation.id !== id)
  )
}


/*
const deletePublication = (activationId: string, linkToDelete: string) => {
  const confirmed = window.confirm(
    '¿Seguro que deseas eliminar esta publicación?'
  )

  if (!confirmed) return

  setActivations(previous =>
    previous.map(activation =>
      activation.id === activationId
        ? {
            ...activation,
            links: activation.links.filter(link => link !== linkToDelete)
          }
        : activation
    )
  )
}*/


const deletePublication = async (
  activationId: string,
  linkToDelete: string
) => {
  const confirmed = window.confirm(
    '¿Seguro que deseas eliminar esta publicación?'
  )

  if (!confirmed) return

  const activation = activations.find(
    item => item.id === activationId
  )

  if (!activation) return

  const updatedLinks = activation.links.filter(
    link => link !== linkToDelete
  )

  const { error } = await supabase
    .from('activations')
    .update({ links: updatedLinks })
    .eq('id', activationId)

  if (error) {
    console.error('Error al eliminar publicación:', error)
    alert('No se pudo eliminar la publicación.')
    return
  }

  setActivations(previous =>
    previous.map(item =>
      item.id === activationId
        ? { ...item, links: updatedLinks }
        : item
    )
  )
}





  /*const createActivation = () => {
    if (!name.trim() || validLinks.length === 0) return

    const newActivation: Activation = {
      id: Date.now(),
      name: name.trim(),
      links: [...new Set(validLinks)],
      createdAt: Date.now()
      //createdAt: Date.now() - (24 * 60 * 60 * 1000)  CREADO PARA PRUEBAS HISTORIAL FECHAS 
    }

    setActivations(previous => [newActivation, ...previous])
    setName('')
    setLinksText('')
    setView('list')
  }*/






  const createActivation = async () => {
  if (!name.trim() || validLinks.length === 0) return

  if (!session?.user) return

  const { data, error } = await supabase
    .from('activations')
    .insert({
      user_id: session.user.id,
      name: name.trim(),
      links: [...new Set(validLinks)]
    })
    .select()
    .single()

  if (error) {
    console.error('Error al guardar activación:', error)
    alert('No se pudo guardar la activación.')
    return
  }

  const newActivation: Activation = {
    id: data.id,
    name: data.name,
    links: data.links,
    createdAt: new Date(data.created_at).getTime()
  }

  setActivations(previous => [newActivation, ...previous])
  setName('')
  setLinksText('')
  setView('list')
}







/*
    useEffect(() => {
    localStorage.setItem(
      'activa-activations',
      JSON.stringify(activations)
    )
  }, [activations])*/





    if (authLoading) {
    return <div className="login-screen">Cargando ACTIVA...</div>
  }

  if (!session) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>ACTIVA</h1>
          <p>Inicia sesión para continuar</p>

          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {authError && <p>{authError}</p>}

          <button onClick={handleLogin}>
            Iniciar sesión
          </button>
        </div>
      </div>
    )
  }





  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">A</div>
          <div>
            <h2>ACTIVA</h2>
            <span>Asistente digital</span>
          </div>
        </div>

        <nav>
          <p className="nav-label">MENÚ PRINCIPAL</p>
          <button className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>⌂ <span>Inicio</span></button>
          <button className={`nav-item ${view === 'new' ? 'active' : ''}`} onClick={() => setView('new')}>✚ <span>Nueva activación</span></button>
          <button className={`nav-item ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>☷ <span>Mis activaciones</span></button>
          <button
            className={`nav-item ${view === 'comments' ? 'active' : ''}`}
            onClick={() => setView('comments')}
          >
            ▤ <span>Comentarios</span>
          </button>
          <button className="nav-item" onClick={() => alert('Próximamente: evidencias')}>▧ <span>Evidencias</span></button>
          <button
  className={`nav-item ${view === 'history' ? 'active' : ''}`}
  onClick={() => setView('history')}
>
  ◷ <span>Historial</span>
</button>
        </nav>
<div className="sidebar-bottom">
  <div className="user-avatar">U</div>
  <div>
    <strong>Mi espacio</strong>
    <span>{session.user.email}</span>
  </div>
  <button className="logout-button" onClick={handleLogout}>
    Cerrar sesión
  </button>
</div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span>Panel de control / {view === 'home' ? 'Inicio' : view === 'new' ? 'Nueva activación' : 'Mis activaciones'}</span>
          <div className="topbar-right">
            <span>● Sistema activo</span>
            <div className="profile">U</div>
          </div>
        </header>

        {view === 'home' && (
          <>
            <section className="welcome">
              <span className="eyebrow">TU ESPACIO DE TRABAJO</span>
              <h1>¡Hola! Bienvenida a ACTIVA 👋</h1>
              <p>Organiza tus activaciones digitales, genera comentarios y administra tus evidencias desde un solo lugar.</p>
            </section>

            <section className="quick-actions">
              <div className="section-heading">
                <h2>¿Qué vamos a hacer hoy?</h2>
                <p>Selecciona una herramienta para comenzar.</p>
              </div>

              <div className="cards">
                <div className="action-card clickable" onClick={() => setView('new')}>
                  <div className="card-icon purple">↗</div>
                  <h3>Nueva activación</h3>
                  <p>Agrega enlaces de publicaciones para comenzar a trabajar.</p>
                  <span>Comenzar →</span>
                </div>

                <div className="action-card">
                  <div className="card-icon pink">☷</div>
                  <h3>Generar comentarios</h3>
                  <p>Obtén comentarios relacionados con cada publicación.</p>
                  <span>Próximamente →</span>
                </div>

                <div className="action-card">
                  <div className="card-icon blue">▧</div>
                  <h3>Mis evidencias</h3>
                  <p>Organiza las capturas de pantalla de tus interacciones.</p>
                  <span>Próximamente →</span>
                </div>

                <div className="action-card clickable" onClick={() => setView('list')}>
                  <div className="card-icon orange">◷</div>
                  <h3>Mis activaciones</h3>
                  <p>Consulta las actividades que has registrado.</p>
                  <span>Consultar →</span>
                </div>
              </div>
            </section>
          </>
        )}

        {view === 'new' && (
          <section className="workspace">
            <button className="back-button" onClick={() => setView('home')}>← Volver al inicio</button>

            <div className="page-heading">
              <span className="eyebrow">GESTIÓN DE ACTIVIDADES</span>
              <h1>Nueva activación</h1>
              <p>Registra una actividad y agrega los enlaces de las publicaciones que necesitas atender.</p>
            </div>

            <div className="form-card">
              <label>Nombre de la activación</label>
              <input
                type="text"
                placeholder="Ej. Activación institucional noviembre"
                value={name}
                onChange={e => setName(e.target.value)}
              />

              <label>Enlaces de publicaciones</label>
              <textarea
                placeholder={'Pega aquí tus enlaces, uno por línea:\n\nhttps://facebook.com/...\nhttps://instagram.com/...'}
                value={linksText}
                onChange={e => setLinksText(e.target.value)}
                rows={8}
              />

              <div className="link-counter">
                <span>{links.length} enlaces detectados</span>
                <span>{validLinks.length} enlaces válidos</span>
              </div>

              <p className="helper-text">Puedes pegar varios enlaces al mismo tiempo, separados por espacios o saltos de línea.</p>

              <button
                className="primary-button"
                onClick={createActivation}
                disabled={!name.trim() || validLinks.length === 0}
              >
                Crear activación →
              </button>
            </div>
          </section>
        )}

        {view === 'list' && (
          <section className="workspace">
            <div className="page-heading">
              <span className="eyebrow">REGISTROS</span>
              <h1>Mis activaciones</h1>
              <p>Consulta las actividades que has registrado en ACTIVA.</p>
            </div>

            <button className="primary-button" onClick={() => setView('new')}>+ Nueva activación</button>

            {todayActivations.length === 0 ? (
              <div className="empty-state">
                <div>☷</div>
                <h3>Aún no tienes activaciones</h3>
                <p>Cuando registres tu primera actividad aparecerá aquí.</p>
              </div>
            ) : (
              <div className="activation-list">
                {todayActivations.map(activation => (
                  <div className="activation-card" key={activation.id}>
                    <div className="activation-header">
  <h3>{activation.name}</h3>

  <button
    className="delete-button"
    onClick={() => deleteActivation(activation.id)}
  >
    🗑 Eliminar activación
  </button>
</div>

<p>{activation.links.length} publicaciones registradas</p>

                    {activation.links.map((link, index) => (
                      <div className="publication-link" key={index}>
                        <span>Publicación {index + 1}</span>
                        <a href={link} target="_blank" rel="noopener noreferrer">Abrir publicación ↗</a>

                        <button
  className="delete-button"
  onClick={() => deletePublication(activation.id, link)}
>
  🗑 Eliminar
</button>

                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}


{view === 'history' && (
  <section className="workspace">
    <div className="page-heading">
      <span className="eyebrow">REGISTROS</span>
      <h1>Historial de activaciones</h1>
      <p>Consulta tus activaciones de los últimos 15 días.</p>
    </div>

    {historyActivations.length === 0 ? (
      <div className="empty-state">
        <div>◷</div>
        <h3>Tu historial está vacío</h3>
        <p>Las activaciones de días anteriores aparecerán aquí.</p>
      </div>
    ) : (
      <div className="activation-list">
        {historyActivations.map(activation => (
          <div className="activation-card" key={activation.id}>
            <div className="activation-header">
  <h3>{activation.name}</h3>

  <button
    className="delete-button"
    onClick={() => deleteActivation(activation.id)}
  >
    🗑 Eliminar activación
  </button>
</div>

<p>
  {new Date(activation.createdAt).toLocaleDateString('es-MX')}
  {' · '}
  {activation.links.length} publicaciones registradas
</p>

            {activation.links.map((link, index) => (
              <div className="publication-link" key={index}>
                <span>Publicación {index + 1}</span>
                <a href={link} target="_blank" rel="noopener noreferrer">
                  Abrir publicación ↗
                </a>
              </div>
            ))}
          </div>
        ))}
      </div>
    )}
  </section>
)}



{view === 'comments' && (
  <section className="workspace">
    <button className="back-button" onClick={() => setView('home')}>
      ← Volver al inicio
    </button>

    <div className="page-heading">
      <span className="eyebrow">ASISTENTE INTELIGENTE</span>
      <h1>Generador de comentarios ✨</h1>
      <p>Prepara propuestas de comentarios para tus publicaciones.</p>
    </div>

    <div className="form-card">
      <label>1. Selecciona una activación</label>

      <select
        value={selectedActivation}
        onChange={e => {
          setSelectedActivation(e.target.value)
          setSelectedLink('')
          setGeneratedComments([])
        }}
      >
        <option value="">Selecciona una activación</option>
        {activations.map(item => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>

      {currentActivation && (
        <>
          <label>2. Selecciona la publicación</label>

          <select
            value={selectedLink}
            onChange={e => {
              setSelectedLink(e.target.value)
              setGeneratedComments([])
            }}
          >
            <option value="">Selecciona una publicación</option>
            {currentActivation.links.map((link, index) => (
              <option key={index} value={link}>
                Publicación {index + 1}
              </option>
            ))}
          </select>
        </>
      )}

      <div className="ai-notice">
        <strong>✨ Análisis con inteligencia artificial</strong>
        <p>
          ACTIVA utilizará el contenido de la publicación cuando
          sea posible obtenerlo. Si la red social restringe el acceso,
          podrás proporcionar una descripción manual.
        </p>
        <span>Conexión del motor de IA: siguiente etapa de desarrollo.</span>
      </div>

  




<div className="institutional-settings">
  <div className="settings-heading">
    <span>⚙️</span>
    <div>
      <strong>Configuración institucional</strong>
      <p>Personaliza los elementos que acompañarán tus comentarios.</p>
    </div>
  </div>

  <label>Cuentas para mencionar (@)</label>
  <input
    type="text"
    value={institutionalAccounts}
    onChange={e => setInstitutionalAccounts(e.target.value)}
    placeholder="@cuenta1 @cuenta2"
  />

  <p className="helper-text">
    Separa las cuentas con espacios o comas.
  </p>

  <label>Hashtags institucionales (#)</label>
  <input
    type="text"
    value={institutionalHashtags}
    onChange={e => setInstitutionalHashtags(e.target.value)}
    placeholder="#TransformarEnGrande"
  />

  <p className="helper-text">
    ACTIVA combinará estas etiquetas con otras relacionadas con la publicación.
  </p>

  <label>Estilo de comentarios</label>
  <select
    value={commentStyle}
    onChange={e => setCommentStyle(e.target.value)}
  >
    <option value="mixed">Variado según la publicación</option>
    <option value="institutional">Institucional y profesional</option>
    <option value="natural">Natural y cercano</option>
    <option value="enthusiastic">Entusiasta y dinámico</option>
  </select>
</div>







      
<div className="analysis-preview">
  <h3>3. Análisis automático de la publicación</h3>

  {analysisLoading && (
    <p>⏳ Analizando publicación, espera un momento...</p>
  )}

  {analysisError && (
    <p>⚠️ {analysisError}</p>
  )}

  {analysisResult && (
    <>
      <p>✓ Análisis del enlace completado</p>

      {analysisResult.image && (
        <img
          src={analysisResult.image}
          alt="Vista previa de la publicación"
          style={{
            width: '100%',
            maxWidth: '350px',
            borderRadius: '10px',
            margin: '12px 0'
          }}
        />
      )}

      <strong>{analysisResult.title || 'Sin título disponible'}</strong>

      <p>
        {analysisResult.description ||
          'No se encontró una descripción pública.'}
      </p>

      <small>Fuente: {analysisResult.platform}</small>
    </>
  )}

  {!analysisLoading && !analysisError && !analysisResult && (
    <p>Selecciona una publicación para comenzar el análisis.</p>
  )}
</div>


      <button
        className="primary-button"
        onClick={generateComments}
        disabled={!description.trim() || analysisLoading}
      >
        ✨ Generar propuestas
      </button>
    </div>

    
{generatedComments.length > 0 && (
  <div className="comments-results">
    <h2>Propuestas de comentarios</h2>
    <p>Selecciona y copia la opción que prefieras.</p>

    {generatedComments.map((comment, index) => (
      <div className="comment-card" key={index}>
        <div className="comment-number">
          PROPUESTA {index + 1}
        </div>

        <p>{comment}</p>

        <div className="comment-actions">
          <button
            className="copy-button"
            onClick={() => copyComment(comment, index)}
          >
            {copiedIndex === index ? '✓ Copiado' : 'Copiar comentario'}
          </button>

          {selectedLink && (
            <>
              <a
                className="open-publication"
                href={selectedLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ir a publicación ↗
              </a>

              
<button
  className="copy-button"
  onClick={async () => {
    try {
      await navigator.clipboard.writeText(comment);
      setCopiedIndex(index);

      window.open(
        selectedLink,
        '_blank',
        'noopener,noreferrer'
      );
    } catch (error) {
      alert('No se pudo copiar el comentario.');
    }
  }}
>
  Copiar e ir a publicación ↗
</button>

            </>
          )}
        </div>
      </div>
    ))}
  </div>
)}
</section>

)}



        <footer>ACTIVA · Asistente de interacciones digitales</footer>
      </main>
    </div>
  )
}

export default App
