import React, { useState, useEffect, useRef } from 'react'
import {
  Home,
  Clock,
  User,
  MapPin,
  CheckCircle,
  LogIn,
  LogOut,
  AlertCircle,
  RefreshCw,
  Lock,
  School,
  Users,
  FileText,
  LayoutDashboard,
  ClipboardList,
  UserPlus,
  Trash2,
  X,
  Camera,
  FileCheck,
  Download,
  FileSpreadsheet,
  Briefcase,
  Activity,
  Upload,
  Paperclip,
  Key,
  Eye,
  EyeOff,
  Image as ImageIcon,
  GraduationCap,
  QrCode,
  Scan,
  Info,
  Search,
  CheckSquare,
  XCircle,
  Edit,
} from 'lucide-react'

// --- Firebase Configuration & Imports ---
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDQHVbZ7wKNwkeBjCeEJwS1wBXH5kNjlNY",
  authDomain: "absensi-smpn1-lembo.firebaseapp.com",
  projectId: "absensi-smpn1-lembo",
  storageBucket: "absensi-smpn1-lembo.firebasestorage.app",
  messagingSenderId: "667230179070",
  appId: "1:667230179070:web:e380aa039a6eb29aae1faf"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : userFirebaseConfig

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Mengamankan ID Database dengan metode Encode agar karakter spesial seperti '/'
// tidak memecah segment database Firestore (Mencegah error Invalid Collection dan Permission Denied)
const rawAppId = typeof __app_id !== 'undefined' ? String(__app_id) : 'smpn6mamosalato-absensi'
const appId = encodeURIComponent(rawAppId)

// --- Helper Functions ---
const getDistanceFromLatLonInM = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const isDateInRange = (dateObj, startStr, endStr) => {
  if (!startStr || !endStr) return false
  const check = new Date(dateObj).setHours(0, 0, 0, 0)

  // Memisahkan string YYYY-MM-DD secara manual agar tidak terpengaruh pergeseran hari karena Timezone UTC
  const [sy, sm, sd] = startStr.split('-')
  const start = new Date(sy, sm - 1, sd).setHours(0, 0, 0, 0)

  const [ey, em, ed] = endStr.split('-')
  const end = new Date(ey, em - 1, ed).setHours(0, 0, 0, 0)

  return check >= start && check <= end
}

export default function App() {
  // --- STATE DECLARATIONS ---
  const [authUser, setAuthUser] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [credentials, setCredentials] = useState({ nip: '', password: '' })
  const [userNip, setUserNip] = useState('')
  const [userName, setUserName] = useState('')

  const [activeTab, setActiveTab] = useState('home')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [todayLog, setTodayLog] = useState(null)
  const [logs, setLogs] = useState([])
  const [employees, setEmployees] = useState([])
  const [students, setStudents] = useState([])
  const [studentLogs, setStudentLogs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [notification, setNotification] = useState(null)
  const [isDbConnected, setIsDbConnected] = useState(false)

  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [pendingAbsen, setPendingAbsen] = useState(null)
  const [showSpecialModal, setShowSpecialModal] = useState(false)
  const [specialAbsenData, setSpecialAbsenData] = useState({
    type: '',
    file: null,
    fileName: '',
    photoBase64: null,
    alasan: '',
    startDate: '',
    endDate: '',
  })

  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterKelas, setFilterKelas] = useState('Semua')

  const [previewImage, setPreviewImage] = useState(null)

  const [showAddModal, setShowAddModal] = useState(false)
  const [newEmployee, setNewEmployee] = useState({ name: '', nip: '', dept: 'Guru' })

  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [newStudent, setNewStudent] = useState({ name: '', nisn: '', kelas: 'VII', parentPhone: '' })

  const [showEditStudentModal, setShowEditStudentModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)

  const [qrModalStudent, setQrModalStudent] = useState(null)

  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [scanMode, setScanMode] = useState('Masuk')
  const scanModeRef = useRef(scanMode)
  const studentsRef = useRef(students)
  const studentLogsRef = useRef(studentLogs)
  const lastScanned = useRef({})

  const [showConfirmDeactivateAll, setShowConfirmDeactivateAll] = useState(false)

  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotNip, setForgotNip] = useState('')
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  const [showPasswordLogin, setShowPasswordLogin] = useState(false)
  const [showPasswordForgot, setShowPasswordForgot] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [visibleAdminPasswords, setVisibleAdminPasswords] = useState({})

  const [logos, setLogos] = useState({ kab: null, sek: null, schoolLocation: null })
  const [showLogoModal, setShowLogoModal] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)

  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)

  const [isParentMode, setIsParentMode] = useState(false)
  const [parentInputNisn, setParentInputNisn] = useState('')
  const [searchedNisn, setSearchedNisn] = useState('')
  const [showParentSpecialModal, setShowParentSpecialModal] = useState(false)
  const [parentSpecialData, setParentSpecialData] = useState({
    type: '',
    photoBase64: null,
    fileName: '',
    alasan: '',
    startDate: '',
    endDate: '',
  })

  // --- DERIVED DATA & SAFETY CHECKS --- (Mencegah ReferenceError)
  const myLogs = logs.filter(log => String(log.nip) === String(userNip) && log.isActive !== false)
  const pendingPasswordResets = employees.filter(emp => emp.resetRequested === true)

  const formatTime = date => date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const formatDate = date =>
    date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const groupedLogs = {}
  logs.forEach(log => {
    const d = new Date(log.timestamp)
    if (d.getMonth() + 1 !== filterMonth || d.getFullYear() !== filterYear) return
    const rawDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(
      2,
      '0'
    )}`
    const key = `${log.nip}_${rawDate}`

    if (!groupedLogs[key]) {
      const emp = employees.find(e => String(e.nip) === String(log.nip))
      groupedLogs[key] = {
        id: key,
        logIds: [],
        name: String(log.name),
        nip: String(log.nip),
        dept: emp ? String(emp.dept) : '-',
        date: String(d.toLocaleDateString('id-ID')),
        rawDate: rawDate,
        time: '-',
        timeKeluar: '-',
        statusKeluar: '-',
        status: '',
        isActive: true,
        alasan: '',
      }
    }
    groupedLogs[key].logIds.push(log.id)
    if (log.isActive === false) groupedLogs[key].isActive = false
    if (['Izin', 'Sakit', 'Tugas Luar'].includes(log.type)) {
      if (log.alasan) groupedLogs[key].alasan = String(log.alasan)
    }

    if (log.type === 'Masuk' || log.type === 'Hadir Terlambat') {
      groupedLogs[key].time = String(formatTime(d).substring(0, 5))
      const h = d.getHours()
      const m = d.getMinutes()
      if (h > 7 || (h === 7 && m > 30) || log.type === 'Hadir Terlambat') groupedLogs[key].status = 'Terlambat'
      else if (
        groupedLogs[key].status !== 'Izin' &&
        groupedLogs[key].status !== 'Sakit' &&
        groupedLogs[key].status !== 'Tugas Luar'
      )
        groupedLogs[key].status = 'Hadir'
    } else if (log.type === 'Keluar' || log.type === 'Pulang') {
      groupedLogs[key].timeKeluar = String(formatTime(d).substring(0, 5))
      if (!groupedLogs[key].status) groupedLogs[key].status = 'Hadir'
    } else {
      groupedLogs[key].time = String(formatTime(d).substring(0, 5))
      groupedLogs[key].status = String(log.type)
    }
  })

  const filteredReportData = Object.values(groupedLogs)
    .map(r => {
      if (r.timeKeluar !== '-') r.statusKeluar = 'Selesai'
      else if (r.status === 'Izin' || r.status === 'Sakit' || r.status === 'Tugas Luar') r.statusKeluar = r.status
      else r.statusKeluar = 'Tidak Absen'
      return r
    })
    .sort((a, b) => a.rawDate.localeCompare(b.rawDate))

  const activeReportData = filteredReportData.filter(r => r.isActive)
  const summary = {
    hadir: activeReportData.filter(r => r.status === 'Hadir').length,
    lambat: activeReportData.filter(r => r.status === 'Terlambat').length,
    tugasLuar: activeReportData.filter(r => r.status === 'Tugas Luar').length,
    izin: activeReportData.filter(r => r.status === 'Izin').length,
    sakit: activeReportData.filter(r => r.status === 'Sakit').length,
    periodStr: String(
      new Date(filterYear, filterMonth - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    ),
  }

  const currentDateStr = String(
    new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
  )
  const getKepalaSekolahData = () => {
    const kepsek = employees.find(emp => emp.dept === 'Kepala Sekolah')
    return kepsek
      ? { name: String(kepsek.name), nip: String(kepsek.nip) }
      : { name: '(.....................................)', nip: '(.....................................)' }
  }

  const getKopHTMLTemplate = () => `
    <table class="kop-surat" style="width: 100%; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 15px; border-collapse: collapse;">
      <tr>
        <td style="width: 90px; text-align: center; vertical-align: middle; border: none; padding: 0;">
          ${logos.kab ? `<img src="${logos.kab}" style="width: 85px; height: 85px; object-fit: contain;" />` : ''}
        </td>
        <td style="text-align: center; vertical-align: middle; border: none; padding: 0px 10px;">
          <div style="font-size: 16px; font-weight: bold; text-transform: uppercase; white-space: nowrap;">PEMERINTAH KABUPATEN MOROWALI UTARA</div>
          <div style="font-size: 18px; font-weight: bold; text-transform: uppercase; margin-top: 4px; white-space: nowrap;">DINAS PENDIDIKAN DAN KEBUDAYAAN DAERAH</div>
          <div style="font-size: 24px; font-weight: bold; text-transform: uppercase; margin-top: 6px; white-space: nowrap;">SMP NEGERI 1 LEMBO</div>
          <div style="font-size: 12px; margin-top: 6px;">Alamat : Kec. Lembo Raya, Kab. Morowali Utara</div>
        </td>
        <td style="width: 90px; text-align: center; vertical-align: middle; border: none; padding: 0;">
          ${logos.sek ? `<img src="${logos.sek}" style="width: 85px; height: 85px; object-fit: contain;" />` : ''}
        </td>
      </tr>
    </table>
  `

  // --- USE EFFECTS & LOGIC ---
  useEffect(() => {
    scanModeRef.current = scanMode
  }, [scanMode])
  useEffect(() => {
    studentsRef.current = students
  }, [students])
  useEffect(() => {
    studentLogsRef.current = studentLogs
  }, [studentLogs])

  const toggleAdminPasswordVisibility = id => {
    setVisibleAdminPasswords(prev => ({ ...prev, [id]: !prev[id] }))
  }

  useEffect(() => {
    const handler = e => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setIsInstallable(false)
      setDeferredPrompt(null)
      showNotification('Aplikasi berhasil diinstal ke HP Anda!', 'success')
    })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallApp = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setIsInstallable(false)
    setDeferredPrompt(null)
  }

  useEffect(() => {
    const appIcon = logos.sek || 'https://cdn-icons-png.flaticon.com/512/3135/3135810.png'
    const manifest = {
      name: 'Absensi SMPN 1 Lembo',
      short_name: 'Absen SMPN 1',
      description: 'Sistem Informasi Absensi SMP NEGERI 1 LEMBO',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#2563eb',
      icons: [{ src: appIcon, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
    }
    const blobManifest = new Blob([JSON.stringify(manifest)], { type: 'application/json' })
    const manifestURL = URL.createObjectURL(blobManifest)

    let link = document.querySelector('link[rel="manifest"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'manifest'
      document.head.appendChild(link)
    }
    link.href = manifestURL

    if (logos.sek) {
      let favicon = document.querySelector('link[rel="icon"]')
      if (!favicon) {
        favicon = document.createElement('link')
        favicon.rel = 'icon'
        document.head.appendChild(favicon)
      }
      favicon.href = logos.sek
    }
    return () => URL.revokeObjectURL(manifestURL)
  }, [logos.sek])

  useEffect(() => {
    if (!document.getElementById('html5-qrcode-script')) {
      const script = document.createElement('script')
      script.id = 'html5-qrcode-script'
      script.src = 'https://unpkg.com/html5-qrcode'
      script.async = true
      script.onload = () => setScriptLoaded(true)
      document.head.appendChild(script)
    } else {
      setScriptLoaded(true)
    }
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token)
        } else {
          await signInAnonymously(auth)
        }
      } catch (error) {
        console.error('Auth Error:', error)
      }
    }
    initAuth()
    const unsubscribe = onAuthStateChanged(auth, setAuthUser)
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!authUser) return

    try {
      const employeesRef = collection(db, 'artifacts', appId, 'public', 'data', 'employees')
      const studentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'students')
      const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'attendance_logs')
      const studentLogsRefPath = collection(db, 'artifacts', appId, 'public', 'data', 'student_attendance_logs')
      const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'logos')

      const unsubLogos = onSnapshot(
        settingsRef,
        docSnap => {
          if (docSnap.exists()) setLogos(docSnap.data())
        },
        err => console.error(err)
      )

      const unsubEmployees = onSnapshot(
        employeesRef,
        async snapshot => {
          setIsDbConnected(true)
          const emps = snapshot.docs.map(doc => ({ id: String(doc.id), ...doc.data() }))
          setEmployees(emps)
        },
        err => setIsDbConnected(false)
      )

      const unsubStudents = onSnapshot(
        studentsRef,
        snapshot => {
          setStudents(snapshot.docs.map(doc => ({ id: String(doc.id), ...doc.data() })))
        },
        err => console.error(err)
      )

      const unsubLogs = onSnapshot(
        logsRef,
        snapshot => {
          const fetchedLogs = snapshot.docs.map(doc => ({
            id: String(doc.id),
            ...doc.data(),
            isActive: doc.data().isActive !== false,
            timestamp: new Date(doc.data().timestamp),
          }))
          fetchedLogs.sort((a, b) => b.timestamp - a.timestamp)
          setLogs(fetchedLogs)
        },
        err => console.error(err)
      )

      const unsubStudentLogs = onSnapshot(
        studentLogsRefPath,
        snapshot => {
          const fetched = snapshot.docs.map(doc => ({ id: String(doc.id), ...doc.data() }))
          fetched.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          setStudentLogs(fetched)
        },
        err => console.error(err)
      )

      return () => {
        unsubEmployees()
        unsubStudents()
        unsubLogs()
        unsubLogos()
        unsubStudentLogs()
      }
    } catch (e) {
      console.error(e)
    }
  }, [authUser])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (userRole === 'pegawai' && userNip) {
      const today = new Date().toDateString()
      const myLogsToday = logs.filter(
        l => String(l.nip) === String(userNip) && new Date(l.timestamp).toDateString() === today && l.isActive !== false
      )
      if (myLogsToday.length > 0) {
        setIsCheckedIn(myLogsToday[0].type === 'Masuk' || myLogsToday[0].type === 'Hadir Terlambat')
        setTodayLog(myLogsToday[0])
      } else {
        setIsCheckedIn(false)
        setTodayLog(null)
      }
    }
  }, [logs, userRole, userNip])

  const showNotification = (message, type = 'success') => {
    setNotification({ message: String(message), type: String(type) })
    setTimeout(() => setNotification(null), 3000)
  }

  const processImageUpload = (file, callback) => {
    const reader = new FileReader()
    reader.onload = event => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scaleSize = 250 / img.width
        canvas.width = 250
        canvas.height = img.height * scaleSize
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        callback(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    let html5QrcodeScanner
    if (activeTab === 'scan' && scriptLoaded && window.Html5QrcodeScanner) {
      html5QrcodeScanner = new window.Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      )
      html5QrcodeScanner.render(decodedText => {
        const now = Date.now()
        if (lastScanned.current[decodedText] && now - lastScanned.current[decodedText] < 3000) return
        lastScanned.current[decodedText] = now
        processStudentScan(decodedText)
      }, undefined)
    }
    return () => {
      if (html5QrcodeScanner) html5QrcodeScanner.clear().catch(e => console.error(e))
    }
  }, [activeTab, scriptLoaded])

  const processStudentScan = async nisn => {
    if (!authUser) return
    const student = studentsRef.current.find(s => String(s.nisn) === String(nisn))
    if (!student) {
      showNotification(`Gagal: NISN ${nisn} tidak ditemukan!`, 'error')
      return
    }

    const todayStr = new Date().toDateString()
    const currentMode = scanModeRef.current

    const hasScannedToday = studentLogsRef.current.some(
      log =>
        String(log.nisn) === String(student.nisn) &&
        log.type === currentMode &&
        new Date(log.timestamp).toDateString() === todayStr
    )

    if (hasScannedToday) {
      showNotification(`Ditolak: ${student.name} sudah absen ${currentMode} hari ini!`, 'error')
      return
    }

    try {
      const logRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'student_attendance_logs'))
      const currentTimeNow = new Date()

      await setDoc(logRef, {
        nisn: String(student.nisn),
        name: String(student.name),
        kelas: String(student.kelas),
        type: String(currentMode),
        approvalStatus: 'Disetujui',
        timestamp: currentTimeNow.toISOString(),
        scannedBy: String(userName),
        parentPhone: student.parentPhone || null,
      })

      if (student.parentPhone) {
        showNotification(`✅ Berhasil: ${student.name}. Membuka WA Otomatis...`, 'success')

        // Format isi pesan otomatis untuk WhatsApp
        const waText = `Pemberitahuan dari SMP Negeri 1 Lembo:\nAnak Anda, *${student.name}* (NISN: ${
          student.nisn
        }), telah absen *${currentMode}* di sekolah pada pukul ${formatTime(currentTimeNow).substring(0, 5)} WITA.`
        const phoneFormatted = String(student.parentPhone).replace(/^0/, '62')
        const waUrl = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(waText)}`

        // Trigger membuka Tab WA Web/App setelah 1 detik
        setTimeout(() => {
          window.open(waUrl, '_blank', 'noopener,noreferrer')
        }, 1000)
      } else {
        showNotification(`✅ Berhasil: ${student.name} (${currentMode})`, 'success')
      }
    } catch (err) {
      showNotification('Gagal mencatat absensi siswa', 'error')
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (err) {
      showNotification('Akses kamera ditolak. Melanjutkan tanpa foto.', 'error')
      setShowCamera(false)
      handleAbsen({
        type: pendingAbsen?.type || (isCheckedIn ? 'Keluar' : 'Masuk'),
        photo: null,
        documentName: pendingAbsen?.fileName,
        alasan: pendingAbsen?.alasan,
        startDate: pendingAbsen?.startDate,
        endDate: pendingAbsen?.endDate,
        approvalStatus: pendingAbsen?.approvalStatus,
      })
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop())
    }
  }

  useEffect(() => {
    if (showCamera) startCamera()
    else stopCamera()
    return () => stopCamera()
  }, [showCamera])

  const capturePhotoAndAbsen = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d')
      canvasRef.current.width = videoRef.current.videoWidth || 480
      canvasRef.current.height = videoRef.current.videoHeight || 640
      context.translate(canvasRef.current.width, 0)
      context.scale(-1, 1)
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)
      const photoData = canvasRef.current.toDataURL('image/jpeg', 0.6)
      stopCamera()
      setShowCamera(false)
      handleAbsen({
        type: pendingAbsen?.type || (isCheckedIn ? 'Keluar' : 'Masuk'),
        photo: photoData,
        documentName: pendingAbsen?.fileName,
        alasan: pendingAbsen?.alasan,
        startDate: pendingAbsen?.startDate,
        endDate: pendingAbsen?.endDate,
        approvalStatus: pendingAbsen?.approvalStatus,
      })
    } else {
      stopCamera()
      setShowCamera(false)
      handleAbsen({
        type: pendingAbsen?.type || (isCheckedIn ? 'Keluar' : 'Masuk'),
        photo: null,
        documentName: pendingAbsen?.fileName,
        alasan: pendingAbsen?.alasan,
        startDate: pendingAbsen?.startDate,
        endDate: pendingAbsen?.endDate,
        approvalStatus: pendingAbsen?.approvalStatus,
      })
    }
  }

  const getLocation = absenType => {
    return new Promise(resolve => {
      if (!navigator.geolocation) {
        resolve({ lat: 0, lng: 0, address: 'Geolokasi tidak didukung oleh browser Anda.', distance: null })
        return
      }
      const successCallback = async position => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        let addressName = `Titik Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
        let isAtSchool = false
        let distanceToSchool = null

        if (logos.schoolLocation && logos.schoolLocation.lat && logos.schoolLocation.lng) {
          distanceToSchool = getDistanceFromLatLonInM(lat, lng, logos.schoolLocation.lat, logos.schoolLocation.lng)
          if (distanceToSchool <= 20) isAtSchool = true
        }

        if (isAtSchool) {
          if (absenType === 'Keluar' || absenType === 'Pulang') {
            addressName = 'Anda Berhasil Absen Pulang di SMP Negeri 1 Lembo'
          } else {
            addressName = 'Berhasil Absen di SMP Negeri 1 Lembo'
          }
        } else {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
              { headers: { 'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8' } }
            )
            const data = await response.json()
            if (data && data.display_name) {
              if (
                !logos.schoolLocation &&
                (data.display_name.toLowerCase().includes('lembo') ||
                  data.display_name.toLowerCase().includes('morowali'))
              ) {
                addressName = `SMP Negeri 1 Lembo, ${data.display_name}`
              } else {
                addressName = data.display_name
              }
            }
          } catch (error) {
            console.error(error)
          }
        }
        resolve({ lat, lng, address: addressName, distance: distanceToSchool })
      }
      const errorCallback = error => {
        let errorMsg = 'Lokasi tidak dapat diakses.'
        if (error.code === 1) errorMsg = 'Gagal: Izin Akses Lokasi Ditolak.'
        else if (error.code === 2) errorMsg = 'Gagal: Sinyal GPS Tidak Ditemukan.'
        else if (error.code === 3) errorMsg = 'Gagal: Waktu Tunggu Habis.'
        resolve({ lat: 0, lng: 0, address: errorMsg, distance: null })
      }
      navigator.geolocation.getCurrentPosition(successCallback, errorCallback, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      })
    })
  }

  const handleSetSchoolLocation = () => {
    if (!navigator.geolocation) {
      showNotification('GPS tidak didukung di perangkat ini', 'error')
      return
    }
    setIsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async position => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        try {
          // PERBAIKAN: Hanya update field schoolLocation tanpa menimpa/menghapus field logo yang sudah ada
          await setDoc(
            doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'logos'),
            { schoolLocation: { lat, lng } },
            { merge: true }
          )
          showNotification('Titik GPS Sekolah berhasil disetel!', 'success')
        } catch (err) {
          showNotification('Gagal menyimpan lokasi sekolah.', 'error')
        }
        setIsLoading(false)
      },
      error => {
        showNotification('Gagal mengambil titik GPS Anda. Pastikan GPS menyala.', 'error')
        setIsLoading(false)
      },
      { enableHighAccuracy: true }
    )
  }

  const handleAbsen = async options => {
    if (!authUser) return
    setIsLoading(true)
    const { type, photo, documentName, alasan, startDate, endDate, approvalStatus } = options
    try {
      const locationData = await getLocation(type)

      // VALIDASI JARAK RADIUS MAKSIMAL 20 METER (Khusus Absen Masuk, Keluar, & HT)
      if ((type === 'Masuk' || type === 'Keluar' || type === 'Hadir Terlambat') && logos.schoolLocation?.lat) {
        if (locationData.lat === 0 && locationData.lng === 0) {
          showNotification('Gagal mendapatkan lokasi. Pastikan GPS/Lokasi HP menyala.', 'error')
          setIsLoading(false)
          setPendingAbsen(null)
          return
        }
        if (locationData.distance !== null && locationData.distance > 20) {
          showNotification('Maaf anda melakukan Absensi bukan pada SMP Negeri 1 Lembo', 'error')
          setIsLoading(false)
          setPendingAbsen(null)
          return // Batalkan proses kirim absen
        }
      }

      const logRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'attendance_logs'))

      const logData = {
        type: String(type),
        timestamp: new Date().toISOString(),
        location: String(locationData.address),
        photo: photo || null,
        document: documentName ? String(documentName) : null,
        alasan: alasan ? String(alasan) : null,
        startDate: startDate ? String(startDate) : null,
        endDate: endDate ? String(endDate) : null,
        approvalStatus: approvalStatus ? String(approvalStatus) : 'Disetujui',
        nip: String(userNip),
        name: String(userName),
        isActive: true,
      }

      await setDoc(logRef, logData)

      if (type === 'Masuk' || type === 'Hadir Terlambat' || type === 'Keluar')
        setIsCheckedIn(type === 'Masuk' || type === 'Hadir Terlambat')
      showNotification(`Berhasil memproses pengajuan ${type}!`, 'success')
    } catch (error) {
      showNotification('Gagal menyimpan data absen ke server.', 'error')
    } finally {
      setIsLoading(false)
      setPendingAbsen(null)
    }
  }

  const handleFileChange = e => {
    const file = e.target.files[0]
    if (!file) return
    processImageUpload(file, base64 => {
      setSpecialAbsenData({ ...specialAbsenData, file: file, fileName: file.name, photoBase64: base64 })
    })
  }

  const submitSpecialAbsen = e => {
    e.preventDefault()
    if (!specialAbsenData.fileName || !specialAbsenData.photoBase64) {
      showNotification('Dokumen foto wajib diunggah!', 'error')
      return
    }
    if (!specialAbsenData.alasan || !specialAbsenData.startDate || !specialAbsenData.endDate) {
      showNotification('Semua kolom (Alasan, Tanggal Mulai, Tanggal Selesai) wajib diisi!', 'error')
      return
    }

    const currentUserData = employees.find(e => String(e.nip) === String(userNip))
    const isKepsek = currentUserData?.dept === 'Kepala Sekolah'
    const status = isKepsek ? 'Disetujui' : 'Menunggu Persetujuan Kepsek'

    setShowSpecialModal(false)
    handleAbsen({
      type: specialAbsenData.type,
      photo: specialAbsenData.photoBase64,
      documentName: specialAbsenData.fileName,
      alasan: specialAbsenData.alasan,
      startDate: specialAbsenData.startDate,
      endDate: specialAbsenData.endDate,
      approvalStatus: status,
    })
  }

  const handleParentFileChange = e => {
    const file = e.target.files[0]
    if (!file) return
    processImageUpload(file, base64 => {
      setParentSpecialData({ ...parentSpecialData, photoBase64: base64, fileName: file.name })
    })
  }

  const submitParentSpecial = async e => {
    e.preventDefault()
    if (!parentSpecialData.photoBase64) {
      showNotification('Wajib mengunggah foto surat/bukti!', 'error')
      return
    }
    if (!parentSpecialData.alasan || !parentSpecialData.startDate || !parentSpecialData.endDate) {
      showNotification('Semua kolom (Alasan, Tanggal Mulai, Tanggal Selesai) wajib diisi!', 'error')
      return
    }
    setIsLoading(true)
    try {
      const studentInfo = students.find(s => String(s.nisn) === String(searchedNisn))
      const logRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'student_attendance_logs'))
      await setDoc(logRef, {
        nisn: String(studentInfo.nisn),
        name: String(studentInfo.name),
        kelas: String(studentInfo.kelas),
        type: String(parentSpecialData.type),
        alasan: String(parentSpecialData.alasan),
        startDate: String(parentSpecialData.startDate),
        endDate: String(parentSpecialData.endDate),
        approvalStatus: 'Menunggu Persetujuan Guru',
        timestamp: new Date().toISOString(),
        scannedBy: 'Portal Orang Tua',
        photoUrl: parentSpecialData.photoBase64,
      })
      showNotification(`Pengajuan ${parentSpecialData.type} berhasil dikirim dan menunggu persetujuan Guru!`, 'success')
      setShowParentSpecialModal(false)
    } catch (error) {
      showNotification('Gagal mengirim pengajuan.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveLog = async (collectionName, id, currentStatus) => {
    let newStatus = 'Disetujui'
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, id), {
        approvalStatus: newStatus,
        approvedBy: String(userName),
      })
      showNotification('Persetujuan berhasil diperbarui', 'success')
    } catch (e) {
      showNotification('Gagal memproses persetujuan', 'error')
    }
  }

  const handleRejectLog = async (collectionName, id) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, id), {
        approvalStatus: 'Ditolak',
        approvedBy: String(userName),
      })
      showNotification('Pengajuan telah ditolak', 'success')
    } catch (e) {
      showNotification('Gagal menolak pengajuan', 'error')
    }
  }

  const handleLogin = e => {
    e.preventDefault()
    if (credentials.nip === 'yusmukmin' && credentials.password === 'SuperAdmin') {
      setUserRole('superadmin')
      setUserNip('yusmukmin')
      setUserName('Gr.YUSMUKMIN, S.I.P')
      setIsLoggedIn(true)
      setActiveTab('admin-home')
      showNotification('Login Super Admin Berhasil!', 'success')
    } else if (credentials.nip.toLowerCase() === 'admin@absensi.com' && credentials.password === 'admin') {
      setUserRole('admin')
      setUserNip('Administrator')
      setUserName('Administrator')
      setIsLoggedIn(true)
      setActiveTab('admin-home')
      showNotification('Login Admin Berhasil!', 'success')
    } else if (credentials.nip.length > 0 && credentials.password.length > 0) {
      const employee = employees.find(emp => String(emp.nip) === String(credentials.nip))
      if (employee) {
        if (employee.isActive === false) {
          showNotification('Akun Anda dinonaktifkan oleh Admin!', 'error')
          return
        }
        if (credentials.password === (employee.password || '123456')) {
          setUserRole('pegawai')
          setUserNip(String(employee.nip))
          setUserName(String(employee.name))
          setIsLoggedIn(true)
          setActiveTab('home')
          showNotification('Login Pegawai Berhasil!', 'success')
        } else {
          showNotification('Password salah!', 'error')
        }
      } else {
        showNotification('NIP / NIK tidak terdaftar!', 'error')
      }
    } else {
      showNotification('NIP/NIK dan Password wajib diisi!', 'error')
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUserRole(null)
    setCredentials({ nip: '', password: '' })
    setUserNip('')
    setUserName('')
    setActiveTab('home')
    showNotification('Berhasil keluar akun', 'success')
  }

  const submitForgotPassword = async e => {
    e.preventDefault()
    if (!authUser) return
    if (forgotNewPassword.length < 6) {
      showNotification('Password baru minimal 6 karakter!', 'error')
      return
    }
    const emp = employees.find(e => String(e.nip) === String(forgotNip))
    if (!emp) {
      showNotification('NIP / NIK tidak ditemukan!', 'error')
      return
    }
    if (emp.resetRequested) {
      showNotification('Permintaan Anda sudah dikirim sebelumnya.', 'error')
      return
    }
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', emp.id), {
        resetRequested: true,
        requestedPassword: String(forgotNewPassword),
      })
      setShowForgotModal(false)
      setForgotNip('')
      setForgotNewPassword('')
      showNotification('Permintaan ubah password dikirim ke Admin!', 'success')
    } catch (error) {
      showNotification('Gagal mengirim permintaan.', 'error')
    }
  }

  const submitChangePassword = async e => {
    e.preventDefault()
    if (!authUser) return
    if (newPassword.length < 6) {
      showNotification('Password baru minimal 6 karakter!', 'error')
      return
    }
    const emp = employees.find(e => String(e.nip) === String(userNip))
    if (emp) {
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', emp.id), {
          password: String(newPassword),
        })
        setShowChangePasswordModal(false)
        setNewPassword('')
        showNotification('Password berhasil diperbarui!', 'success')
      } catch (error) {
        showNotification('Gagal mengubah password.', 'error')
      }
    }
  }

  const handleApproveResetPassword = async id => {
    if (!authUser) return
    const emp = employees.find(e => e.id === id)
    if (!emp) return
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', id), {
        password: String(emp.requestedPassword || '123456'),
        resetRequested: false,
        requestedPassword: null,
      })
      showNotification(`Password ${emp.name} diperbarui.`, 'success')
    } catch (error) {
      showNotification('Gagal menyetujui perubahan.', 'error')
    }
  }

  const handleAddEmployee = async e => {
    e.preventDefault()
    if (!authUser) return
    if (!newEmployee.name || !newEmployee.nip) {
      showNotification('Nama dan NIP harus diisi!', 'error')
      return
    }
    try {
      await setDoc(doc(collection(db, 'artifacts', appId, 'public', 'data', 'employees')), {
        name: String(newEmployee.name),
        nip: String(newEmployee.nip),
        dept: String(newEmployee.dept),
        password: '123456',
        resetRequested: false,
        isActive: true,
        createdAt: new Date().toISOString(),
      })
      setNewEmployee({ name: '', nip: '', dept: 'Guru' })
      setShowAddModal(false)
      showNotification('Pegawai ditambahkan!', 'success')
    } catch (err) {
      showNotification('Gagal menyimpan pegawai', 'error')
    }
  }

  const handleDeleteEmployee = async id => {
    if (!authUser) return
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', id))
      showNotification('Data dihapus', 'success')
    } catch (err) {
      showNotification('Gagal menghapus', 'error')
    }
  }

  const handleToggleEmployeeStatus = async (id, currentStatus) => {
    if (!authUser) return
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', id), { isActive: !currentStatus })
      showNotification(`Akun ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}`, 'success')
    } catch (error) {
      showNotification('Gagal mengubah status', 'error')
    }
  }

  const handleDeactivateAllEmployees = async () => {
    if (!authUser) return
    setIsLoading(true)
    try {
      const promises = employees.map(emp =>
        updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', emp.id), { isActive: false })
      )
      await Promise.all(promises)
      showNotification('Semua akun dinonaktifkan', 'success')
      setShowConfirmDeactivateAll(false)
    } catch (error) {
      showNotification('Gagal menonaktifkan', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddStudent = async e => {
    e.preventDefault()
    if (!authUser) return
    if (!newStudent.name || !newStudent.nisn) {
      showNotification('Wajib diisi!', 'error')
      return
    }
    try {
      await setDoc(doc(collection(db, 'artifacts', appId, 'public', 'data', 'students')), {
        name: String(newStudent.name),
        nisn: String(newStudent.nisn),
        kelas: String(newStudent.kelas),
        parentPhone: String(newStudent.parentPhone),
        createdAt: new Date().toISOString(),
      })
      setNewStudent({ name: '', nisn: '', kelas: 'VII', parentPhone: '' })
      setShowAddStudentModal(false)
      showNotification('Data siswa ditambahkan!', 'success')
    } catch (err) {
      showNotification('Gagal menyimpan', 'error')
    }
  }

  const handleEditStudent = async e => {
    e.preventDefault()
    if (!authUser || !editingStudent) return
    if (!editingStudent.name || !editingStudent.nisn) {
      showNotification('Nama & NISN Wajib diisi!', 'error')
      return
    }
    setIsLoading(true)
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', editingStudent.id), {
        name: String(editingStudent.name),
        nisn: String(editingStudent.nisn),
        kelas: String(editingStudent.kelas),
        parentPhone: String(editingStudent.parentPhone || ''),
      })
      setShowEditStudentModal(false)
      setEditingStudent(null)
      showNotification('Data siswa berhasil diperbarui!', 'success')
    } catch (err) {
      showNotification('Gagal memperbarui data', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteStudent = async id => {
    if (!authUser) return
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id))
      showNotification('Data dihapus', 'success')
    } catch (err) {
      showNotification('Gagal menghapus', 'error')
    }
  }

  const handleEmployeePhotoUpload = (e, empId) => {
    const file = e.target.files[0]
    if (!file || !authUser) return
    processImageUpload(file, async base64 => {
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', empId), { photoUrl: base64 })
        showNotification('Foto diperbarui!', 'success')
      } catch (error) {
        showNotification('Gagal mengunggah.', 'error')
      }
    })
  }

  const handleStudentPhotoUpload = (e, studentId) => {
    const file = e.target.files[0]
    if (!file || !authUser) return
    processImageUpload(file, async base64 => {
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId), { photoUrl: base64 })
        showNotification('Foto diperbarui!', 'success')
      } catch (error) {
        showNotification('Gagal mengunggah.', 'error')
      }
    })
  }

  const handleDeleteLogGroup = async logIds => {
    if (!authUser) return
    try {
      for (const id of logIds) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'attendance_logs', id))
      showNotification('Riwayat dihapus', 'success')
    } catch (err) {
      showNotification('Gagal menghapus', 'error')
    }
  }

  const handleToggleLogStatusGroup = async (logIds, currentStatus) => {
    if (!authUser) return
    try {
      for (const id of logIds)
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'attendance_logs', id), {
          isActive: !currentStatus,
        })
      showNotification(`Status diubah`, 'success')
    } catch (error) {
      showNotification('Gagal mengubah', 'error')
    }
  }

  const handleDeleteStudentLog = async logId => {
    if (!authUser || !['admin', 'superadmin'].includes(userRole)) return
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'student_attendance_logs', logId))
      showNotification('Riwayat scan siswa berhasil dihapus', 'success')
    } catch (err) {
      showNotification('Gagal menghapus riwayat scan siswa', 'error')
    }
  }

  const handlePrintQR = student => {
    const printWindow = window.open('', '_blank')
    const frontQrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(
      student.nisn
    )}&size=150&margin=0&dark=ffffff&light=164e63`
    const backQrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(student.nisn)}&size=300&margin=1`
    const photoHtml = student.photoUrl
      ? `<img src="${student.photoUrl}" alt="Foto" class="card-photo" />`
      : `<div class="photo-placeholder">FOTO SISWA</div>`

    // Perbaikan pengambilan logo (Bisa langsung mengambil state logos)
    const logoSrc = logos.sek || logos.kab || 'https://cdn-icons-png.flaticon.com/512/3135/3135810.png'

    const htmlContent = `
      <html>
        <head><title>Kartu Absensi - ${student.name}</title>
        <style>
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 20px; display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; background-color: #f0f2f5; margin: 0; }
          .card { width: 53.98mm; height: 85.60mm; position: relative; overflow: hidden; page-break-inside: avoid; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border-radius: 2mm; box-sizing: border-box; }
          .card-header { position: absolute; top: 0; left: 0; width: 100%; height: 12mm; background: white; border-bottom: 1.5px solid #0ea5e9; display: flex; align-items: center; padding: 0 3mm; box-sizing: border-box; z-index: 20; }
          .header-logo { width: 8.5mm; height: 8.5mm; object-fit: contain; margin-right: 2mm; }
          .header-text { display: flex; flex-direction: column; text-align: left; }
          .header-text h2 { margin: 0; font-size: 7.5pt; font-weight: 900; color: #b91c1c; line-height: 1.1; letter-spacing: 0.2px; }
          .header-text h3 { margin: 0; font-size: 5.5pt; color: #1e293b; font-weight: 800; line-height: 1.1; }
          .card-photo { position: absolute; top: 12mm; left: 0; width: 100%; height: 73.6mm; object-fit: cover; background: #f1f5f9; z-index: 10; }
          .photo-placeholder { position: absolute; top: 12mm; left: 0; width: 100%; height: 73.6mm; display: flex; align-items: center; justify-content: center; background: #f1f5f9; color: #94a3b8; font-size: 8pt; font-weight: bold; z-index: 10; }
          .card-footer { position: absolute; bottom: 0; left: 0; width: 100%; height: 22mm; background: #164e63; display: flex; align-items: center; justify-content: space-between; padding: 0 3.5mm; box-sizing: border-box; z-index: 30; overflow: hidden; } 
          .card-footer::before { content: ''; position: absolute; left: -5mm; bottom: -2mm; width: 18mm; height: 18mm; border-radius: 50%; background: #7e22ce; opacity: 0.9; z-index: 31; }
          .card-footer::after { content: ''; position: absolute; left: 2mm; top: 2mm; width: 2.5mm; height: 2.5mm; background: #e2e8f0; opacity: 0.8; z-index: 31; border-radius: 0.5mm; }
          .footer-info { position: relative; z-index: 32; display: flex; flex-direction: column; text-align: left; max-width: 60%; }
          .footer-info .name { font-size: 7.5pt; font-weight: 900; color: white; margin-bottom: 0.5mm; line-height: 1.1; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .footer-info .nisn { font-size: 5pt; color: #e2e8f0; font-weight: 600; line-height: 1.2; }
          .footer-qr { position: relative; z-index: 32; display: flex; align-items: center; justify-content: center; }
          .footer-qr img { width: 16mm; height: 16mm; object-fit: contain; }
          .card-back { padding: 4mm; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc; }
          .qr-img-back { width: 34mm; height: 34mm; border: 2px solid #e2e8f0; border-radius: 2mm; padding: 1.5mm; background: white; margin-bottom: 3.5mm; position: relative; z-index: 30; }
          .back-title { font-size: 9pt; font-weight: 900; margin-bottom: 3mm; color: #333; position: relative; z-index: 30;}
          .back-text { font-size: 6.5pt; color: #64748b; font-weight: 600; padding: 0 1.5mm; line-height: 1.4; position: relative; z-index: 30;}
          .card-label { position: absolute; top: 1.5mm; right: 1.5mm; font-size: 4.5pt; color: #94a3b8; font-weight: bold; z-index: 40; }
          @media print { body { background-color: white; padding: 0; } .card { box-shadow: none; border: 0.5px solid #ccc; } }
        </style></head>
        <body>
          <div class="card"><div class="card-label">DEPAN</div><div class="card-header"><img src="${logoSrc}" alt="Logo" class="header-logo" /><div class="header-text"><h2>KARTU ABSENSI SISWA</h2><h3>SMP NEGERI 1 LEMBO</h3></div></div>${photoHtml}<div class="card-footer"><div class="footer-info"><div class="name">${student.name}</div><div class="nisn">NISN : ${student.nisn}</div><div class="nisn">KELAS ${student.kelas}</div></div><div class="footer-qr"><img src="${frontQrUrl}" alt="QR" /></div></div></div> 
          <div class="card card-back"><div class="card-label">BELAKANG</div><div class="back-title">SCAN QR CODE</div><img src="${backQrUrl}" alt="QR Code" class="qr-img-back" /><p class="back-text">Gunakan QR Code ini pada perangkat pemindai absensi yang tersedia di sekolah.</p></div>
          <script>setTimeout(() => window.print(), 1500);</script>
        </body>
      </html>
    `
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  const handleLogoUpload = (e, type) => {
    const file = e.target.files[0]
    if (!file || !authUser) return
    const reader = new FileReader()
    reader.onload = event => {
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        const scaleSize = 150 / img.width
        canvas.width = 150
        canvas.height = img.height * scaleSize
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        try {
          // PERBAIKAN: Hanya update spesifik logo (kab/sek) tanpa menimpa logo yang lain atau titik GPS
          await setDoc(
            doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'logos'),
            { [type]: canvas.toDataURL('image/png', 0.8) },
            { merge: true }
          )
          showNotification('Logo berhasil diperbarui!', 'success')
        } catch (error) {
          showNotification('Gagal menyimpan logo', 'error')
        }
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const generateEmployeeReportData = () => {
    const logsInMonth = logs.filter(l => {
      const d = new Date(l.timestamp)
      return d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear
    })

    // PERBAIKAN: Masukkan juga tanggal Izin/Sakit/Tugas Luar ke dalam daftar hari yang dicetak
    const activeDaysSet = new Set()

    // 1. Masukkan hari di mana ada yang absen Masuk/Pulang
    logsInMonth.forEach(l => {
      if (['Masuk', 'Keluar', 'Pulang'].includes(l.type)) activeDaysSet.add(new Date(l.timestamp).toDateString())
    })

    // 2. Masukkan hari dari rentang pengajuan (Tampilkan walau belum disetujui / ditolak)
    logs.forEach(l => {
      if (['Izin', 'Sakit', 'Tugas Luar'].includes(l.type) && l.startDate && l.endDate) {
        let current = new Date(l.startDate)
        current.setHours(0, 0, 0, 0)
        const end = new Date(l.endDate)
        end.setHours(0, 0, 0, 0)
        let safeLimit = 0
        while (current <= end && safeLimit < 100) {
          if (current.getMonth() + 1 === filterMonth && current.getFullYear() === filterYear) {
            if (current.getDay() !== 0) activeDaysSet.add(current.toDateString()) // 0 = Minggu
          }
          current.setDate(current.getDate() + 1)
          safeLimit++
        }
      }
    })

    const activeDaysStrings = [...activeDaysSet]
    const activeDays = activeDaysStrings.map(d => new Date(d)).sort((a, b) => b - a) // Urut dari tgl terbaru

    const reportData = []
    let tHadir = 0,
      tLambat = 0,
      tTL = 0,
      tIzin = 0,
      tSakit = 0,
      tAlpa = 0

    activeDays.forEach(dateObj => {
      const dateStr = dateObj.toLocaleDateString('id-ID')
      const rawDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(
        dateObj.getDate()
      ).padStart(2, '0')}`

      employees.forEach(emp => {
        const dayLogs = logsInMonth.filter(
          l =>
            String(l.nip) === String(emp.nip) &&
            new Date(l.timestamp).toDateString() === dateObj.toDateString() &&
            l.isActive !== false
        )

        const leaveRequest = logs.find(
          l =>
            String(l.nip) === String(emp.nip) &&
            ['Izin', 'Sakit', 'Tugas Luar'].includes(l.type) &&
            l.isActive !== false &&
            isDateInRange(dateObj, l.startDate, l.endDate)
        )

        let timeMasuk = '-'
        let timePulang = '-'
        let status = 'Alpa'
        let statusKeluar = '-'
        let alasan = ''
        let logIds = []
        let hasMasuk = false
        let hasPulang = false

        dayLogs.forEach(log => {
          logIds.push(log.id)
          const t = formatTime(new Date(log.timestamp)).substring(0, 5)
          if (log.type === 'Masuk' || log.type === 'Hadir Terlambat') {
            timeMasuk = t
            hasMasuk = true
            const h = new Date(log.timestamp).getHours()
            const m = new Date(log.timestamp).getMinutes()
            if (h > 7 || (h === 7 && m > 30) || log.type === 'Hadir Terlambat') status = 'Terlambat'
            else status = 'Hadir'
          }
          if (log.type === 'Keluar' || log.type === 'Pulang') {
            timePulang = t
            hasPulang = true
          }
        })

        if (leaveRequest) {
          if (!logIds.includes(leaveRequest.id)) logIds.push(leaveRequest.id)

          if (leaveRequest.approvalStatus === 'Disetujui') {
            alasan = leaveRequest.alasan ? `${leaveRequest.alasan} (Disetujui)` : `Disetujui`
            if (hasMasuk) {
              timePulang = 'Hadir'
              statusKeluar = leaveRequest.type
            } else {
              status = leaveRequest.type
              statusKeluar = leaveRequest.type
              timeMasuk = leaveRequest.type
              timePulang = leaveRequest.type
            }
          } else if (leaveRequest.approvalStatus === 'Ditolak') {
            alasan = leaveRequest.alasan ? `${leaveRequest.alasan} (Ditolak Kepsek)` : `Ditolak Kepsek`
            if (hasMasuk && hasPulang) {
              statusKeluar = 'Selesai'
            } else if (hasMasuk && !hasPulang) {
              const now = new Date()
              if (dateObj.toDateString() === now.toDateString() && now.getHours() < 13) {
                statusKeluar = 'Belum Pulang'
              } else {
                status = 'Alpa'
                statusKeluar = 'Tdk Absen Pulang'
              }
            } else {
              const now = new Date()
              if (dateObj.toDateString() === now.toDateString() && now.getHours() < 8) {
                status = 'Belum Absen'
                statusKeluar = '-'
              } else {
                status = 'Alpa'
                statusKeluar = 'Tanpa Keterangan'
              }
            }
          } else {
            // Menunggu Persetujuan (Belum Disetujui) -> Tercatat Sebagai Alpa
            alasan = leaveRequest.alasan ? `${leaveRequest.alasan} (Menunggu Persetujuan)` : `Menunggu Persetujuan`
            if (hasMasuk && hasPulang) {
              statusKeluar = 'Selesai'
            } else if (hasMasuk && !hasPulang) {
              const now = new Date()
              if (dateObj.toDateString() === now.toDateString() && now.getHours() < 13) {
                statusKeluar = 'Belum Pulang'
              } else {
                status = 'Alpa'
                statusKeluar = 'Tdk Absen Pulang'
              }
            } else {
              const now = new Date()
              if (dateObj.toDateString() === now.toDateString() && now.getHours() < 8) {
                status = 'Belum Absen'
                statusKeluar = '-'
              } else {
                status = 'Alpa'
                statusKeluar = 'Tanpa Keterangan'
              }
            }
          }
        } else {
          if (hasMasuk && hasPulang) {
            statusKeluar = 'Selesai'
          } else if (hasMasuk && !hasPulang) {
            const now = new Date()
            if (dateObj.toDateString() === now.toDateString() && now.getHours() < 13) {
              statusKeluar = 'Belum Pulang'
            } else {
              status = 'Alpa'
              statusKeluar = 'Tdk Absen Pulang'
            }
          } else {
            const now = new Date()
            if (dateObj.toDateString() === now.toDateString() && now.getHours() < 8) {
              status = 'Belum Absen'
              statusKeluar = '-'
            } else {
              status = 'Alpa'
              statusKeluar = 'Tanpa Keterangan'
            }
          }
        }

        if (status === 'Hadir') tHadir++
        if (status === 'Terlambat') tLambat++
        if (status === 'Izin') tIzin++
        if (status === 'Sakit') tSakit++
        if (status === 'Tugas Luar') tTL++
        if (status === 'Alpa') tAlpa++

        // Menentukan Kode Keterangan sesuai Legend Gambar
        let statusCode = ''
        if (status === 'Hadir') statusCode = 'H1'
        else if (status === 'Terlambat') statusCode = 'HT'
        else if (status === 'Tugas Luar') statusCode = 'TL'
        else if (status === 'Izin') statusCode = 'I'
        else if (status === 'Sakit') statusCode = 'S'
        else if (status === 'Alpa') statusCode = 'A'

        const dayOfWeek = dateObj.getDay()

        reportData.push({
          id: `${emp.nip}_${rawDate}`,
          logIds,
          name: emp.name,
          nip: emp.nip,
          dept: emp.dept,
          date: dateStr,
          rawDate,
          time: timeMasuk,
          timeKeluar: timePulang,
          statusKeluar,
          status,
          alasan,
          isActive: true,
          statusCode,
          dayOfWeek,
        })
      })
    })

    reportData.sort((a, b) => b.rawDate.localeCompare(a.rawDate))
    const periodStr = String(
      new Date(filterYear, filterMonth - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    )
    return {
      reportData,
      summary: { hadir: tHadir, lambat: tLambat, izin: tIzin, sakit: tSakit, tugasLuar: tTL, alpa: tAlpa, periodStr },
    }
  }

  const generateStudentReportData = () => {
    const filteredStudents = students.filter(s => filterKelas === 'Semua' || s.kelas === filterKelas)

    // PERBAIKAN: Pastikan tanggal pengajuan Izin/Sakit masuk ke daftar hari aktif walau belum disetujui
    const activeDaysSet = new Set()

    // 1. Ambil hari dari scan Masuk/Pulang
    studentLogs.forEach(l => {
      const d = new Date(l.timestamp)
      if (d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear) {
        if (l.type === 'Masuk' || l.type === 'Pulang') activeDaysSet.add(d.toDateString())
      }
    })

    // 2. Ambil hari dari rentang Izin/Sakit (Kecuali hari Minggu)
    studentLogs.forEach(l => {
      if (['Izin', 'Sakit'].includes(l.type) && l.startDate && l.endDate) {
        let current = new Date(l.startDate)
        current.setHours(0, 0, 0, 0)
        const end = new Date(l.endDate)
        end.setHours(0, 0, 0, 0)
        let safeLimit = 0
        while (current <= end && safeLimit < 100) {
          if (current.getMonth() + 1 === filterMonth && current.getFullYear() === filterYear) {
            if (current.getDay() !== 0) activeDaysSet.add(current.toDateString()) // 0 = Minggu
          }
          current.setDate(current.getDate() + 1)
          safeLimit++
        }
      }
    })

    const activeDaysStrings = [...activeDaysSet]
    // Diurutkan dari tanggal awal ke akhir (Kronologis)
    const activeDays = activeDaysStrings.map(d => new Date(d)).sort((a, b) => a - b)

    const reportData = []
    let totalHadir = 0,
      totalIzin = 0,
      totalSakit = 0,
      totalAlpa = 0

    activeDays.forEach(dateObj => {
      const dateStr = dateObj.toLocaleDateString('id-ID')
      const rawDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(
        dateObj.getDate()
      ).padStart(2, '0')}`

      filteredStudents.forEach(student => {
        const dayLogs = studentLogs.filter(
          l =>
            String(l.nisn) === String(student.nisn) && new Date(l.timestamp).toDateString() === dateObj.toDateString()
        )

        // Cek apakah ada Izin/Sakit pada rentang tanggal tersebut
        const leaveRequest = studentLogs.find(
          l =>
            String(l.nisn) === String(student.nisn) &&
            ['Izin', 'Sakit'].includes(l.type) &&
            isDateInRange(dateObj, l.startDate, l.endDate)
        )

        let timeMasuk = '-'
        let timePulang = '-'
        let status = 'Alpa'
        let statusKeluar = '-'
        let keterangan = '-'
        let hasMasuk = false
        let hasPulang = false

        dayLogs.forEach(log => {
          const t = formatTime(new Date(log.timestamp)).substring(0, 5)
          if (log.type === 'Masuk') {
            timeMasuk = t
            hasMasuk = true
          }
          if (log.type === 'Pulang') {
            timePulang = t
            hasPulang = true
          }
        })

        if (leaveRequest) {
          if (leaveRequest.approvalStatus === 'Disetujui') {
            keterangan = leaveRequest.alasan ? `${leaveRequest.alasan} (Disetujui)` : `Disetujui`
            if (hasMasuk) {
              timePulang = 'Hadir'
              statusKeluar = leaveRequest.type
              status = 'Hadir'
            } else {
              status = leaveRequest.type
              statusKeluar = leaveRequest.type
              timeMasuk = leaveRequest.type
              timePulang = leaveRequest.type
            }
          } else if (leaveRequest.approvalStatus === 'Ditolak') {
            keterangan = leaveRequest.alasan ? `${leaveRequest.alasan} (Ditolak)` : `Ditolak`
            if (hasMasuk && hasPulang) {
              status = 'Hadir'
              statusKeluar = 'Selesai'
            } else if (hasMasuk && !hasPulang) {
              const now = new Date()
              if (dateObj.toDateString() === now.toDateString() && now.getHours() < 13) {
                status = 'Hadir'
                statusKeluar = 'Belum Pulang'
              } else {
                status = 'Alpa'
                statusKeluar = 'Tdk Absen Pulang'
              }
            } else {
              const now = new Date()
              if (dateObj.toDateString() === now.toDateString() && now.getHours() < 8) {
                status = 'Belum Absen'
                statusKeluar = '-'
              } else {
                status = 'Alpa'
                statusKeluar = 'Tanpa Keterangan'
              }
            }
          } else {
            keterangan = leaveRequest.alasan ? `${leaveRequest.alasan} (Menunggu Persetujuan)` : `Menunggu Persetujuan`
            if (hasMasuk && hasPulang) {
              status = 'Hadir'
              statusKeluar = 'Selesai'
            } else if (hasMasuk && !hasPulang) {
              const now = new Date()
              if (dateObj.toDateString() === now.toDateString() && now.getHours() < 13) {
                status = 'Hadir'
                statusKeluar = 'Belum Pulang'
              } else {
                status = 'Alpa'
                statusKeluar = 'Tdk Absen Pulang'
              }
            } else {
              const now = new Date()
              if (dateObj.toDateString() === now.toDateString() && now.getHours() < 8) {
                status = 'Belum Absen'
                statusKeluar = '-'
              } else {
                status = 'Alpa'
                statusKeluar = 'Tanpa Keterangan'
              }
            }
          }
        } else {
          if (hasMasuk && hasPulang) {
            status = 'Hadir'
            statusKeluar = 'Selesai'
          } else if (hasMasuk && !hasPulang) {
            const now = new Date()
            if (dateObj.toDateString() === now.toDateString() && now.getHours() < 13) {
              status = 'Hadir'
              statusKeluar = 'Belum Pulang'
            } else {
              status = 'Alpa'
              statusKeluar = 'Tdk Absen Pulang'
            }
          } else {
            const now = new Date()
            if (dateObj.toDateString() === now.toDateString() && now.getHours() < 8) {
              status = 'Belum Absen'
              statusKeluar = '-'
            } else {
              status = 'Alpa'
              statusKeluar = 'Tanpa Keterangan'
            }
          }
        }

        if (status === 'Hadir') totalHadir++
        if (status === 'Izin') totalIzin++
        if (status === 'Sakit') totalSakit++
        if (status === 'Alpa') totalAlpa++

        let statusCode = ''
        if (status === 'Hadir') statusCode = 'H'
        else if (status === 'Izin') statusCode = 'I'
        else if (status === 'Sakit') statusCode = 'S'
        else if (status === 'Alpa') statusCode = 'A'
        const dayOfWeek = dateObj.getDay()

        reportData.push({
          name: student.name,
          nisn: student.nisn,
          kelas: student.kelas,
          dateStr,
          rawDate,
          timeMasuk,
          timePulang,
          statusKeluar,
          status,
          keterangan,
          statusCode,
          dayOfWeek,
        })
      })
    })

    // Mengurutkan secara kronologis, lalu menurut nama siswa
    reportData.sort((a, b) => {
      if (a.rawDate === b.rawDate) {
        return a.name.localeCompare(b.name)
      }
      return a.rawDate.localeCompare(b.rawDate)
    })

    const periodStr = String(
      new Date(filterYear, filterMonth - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    )
    return { reportData, totals: { hadir: totalHadir, izin: totalIzin, sakit: totalSakit, alpa: totalAlpa }, periodStr }
  }

  const handleDownloadExcel = () => {
    showNotification('Memproses file Excel...', 'success')
    const kepsekData = getKepalaSekolahData()
    const { reportData, summary } = generateEmployeeReportData()

    let tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          .table-bordered { border-collapse: collapse; width: 100%; } 
          .table-bordered th, .table-bordered td { border: 1px solid black; padding: 5px; text-align: center; vertical-align: middle; } 
          .text-left { text-align: left !important; } 
          .no-border { border: none !important; } 
          .kop-title { font-weight: bold; font-size: 14pt; } 
          .kop-subtitle { font-weight: bold; font-size: 16pt; } 
          .kop-text { font-size: 12pt; } 
          .bg-header { background-color: #f3f3f3; font-weight: bold; }
          .bg-red-custom { background-color: red; color: white; font-weight: bold; }
        </style>
      </head>
      <body>
        <table class="no-border" style="width: 100%;">
          <tr><td colspan="21" align="center" class="no-border kop-text">PEMERINTAH KABUPATEN MOROWALI UTARA</td></tr>
          <tr><td colspan="21" align="center" class="no-border kop-title">DINAS PENDIDIKAN DAN KEBUDAYAAN DAERAH</td></tr>
          <tr><td colspan="21" align="center" class="no-border kop-subtitle">SMP NEGERI 1 LEMBO</td></tr>
          <tr><td colspan="21" align="center" class="no-border kop-text">Alamat : Kec. Lembo Raya, Kab. Morowali Utara</td></tr>
          <tr><td colspan="21" class="no-border"></td></tr>
          <tr><td colspan="21" align="center" class="no-border" style="font-weight: bold; font-size: 14pt;">LAPORAN KEHADIRAN PEGAWAI</td></tr>
          <tr><td colspan="21" align="center" class="no-border">Periode: ${summary.periodStr}</td></tr>
          <tr><td colspan="21" class="no-border"></td></tr>
        </table>
        
        <table class="table-bordered">
          <thead>
            <tr class="bg-header">
              <th>No</th>
              <th class="text-left">Nama Pegawai</th>
              <th>NIP / NIK</th>
              <th class="text-left">Jabatan</th>
              <th>Tanggal</th>
              <th>Jam Masuk</th>
              <th>Jam Pulang</th>
              <th class="bg-red-custom">Mgg</th>
              <th>Sen</th>
              <th>Sel</th>
              <th>Rab</th>
              <th>Kam</th>
              <th>Jum</th>
              <th>Sab</th>
              <th>Ket. Pulang</th>
              <th>Hadir</th>
              <th>Lambat</th>
              <th>Tugas Luar</th>
              <th>Izin</th>
              <th>Sakit</th>
              <th>Tanpa Keterangan</th>
            </tr>
          </thead>
          <tbody>`

    reportData.forEach((row, index) => {
      const days = ['', '', '', '', '', '', '']
      days[row.dayOfWeek] = row.statusCode

      tableHtml += `<tr>
          <td>${index + 1}</td>
          <td class="text-left">${row.name}</td>
          <td style="mso-number-format:'\\@';">${row.nip}</td>
          <td class="text-left">${row.dept}</td>
          <td>${row.date}</td>
          <td>${row.time}</td>
          <td>${row.timeKeluar}</td>
          <td class="bg-red-custom">${days[0]}</td>
          <td>${days[1]}</td>
          <td>${days[2]}</td>
          <td>${days[3]}</td>
          <td>${days[4]}</td>
          <td>${days[5]}</td>
          <td>${days[6]}</td>
          <td>${row.statusKeluar}</td>
          <td>${row.status === 'Hadir' ? '1' : ''}</td>
          <td>${row.status === 'Terlambat' ? '1' : ''}</td>
          <td>${row.status === 'Tugas Luar' ? '1' : ''}</td>
          <td>${row.status === 'Izin' ? '1' : ''}</td>
          <td>${row.status === 'Sakit' ? '1' : ''}</td>
          <td>${row.status === 'Alpa' ? '1' : ''}</td>
        </tr>`
    })

    tableHtml += `</tbody>
      <tfoot>
        <tr class="bg-header">
          <th colspan="15" style="text-align: right; padding-right: 15px;">TOTAL KESELURUHAN</th>
          <th>${summary.hadir}</th>
          <th>${summary.lambat}</th>
          <th>${summary.tugasLuar}</th>
          <th>${summary.izin}</th>
          <th>${summary.sakit}</th>
          <th>${summary.alpa}</th>
        </tr>
      </tfoot>
    </table><br/>`

    tableHtml += `<table class="no-border" style="width: 100%; margin-top: 20px;">
      <tr>
         <td colspan="6" class="no-border text-left" style="font-weight: bold; font-size: 12pt;">Keterangan</td>
         <td colspan="9" class="no-border"></td>
         <td colspan="6" class="no-border" align="center">Lembo Raya, ${currentDateStr}</td>
      </tr>
      <tr>
         <td colspan="1" style="border: 1px solid black; text-align:center;">H1</td>
         <td colspan="5" style="border: 1px solid black; text-align:left;">Hadir Tepat Waktu</td>
         <td colspan="9" class="no-border"></td>
         <td colspan="6" class="no-border" align="center">Mengetahui,</td>
      </tr>
      <tr>
         <td colspan="1" style="border: 1px solid black; text-align:center;">HT</td>
         <td colspan="5" style="border: 1px solid black; text-align:left;">Hadir Terlambat</td>
         <td colspan="9" class="no-border"></td>
         <td colspan="6" class="no-border" align="center" style="font-weight: bold;">Kepala Sekolah</td>
      </tr>
      <tr>
         <td colspan="1" style="border: 1px solid black; text-align:center;">TL</td>
         <td colspan="5" style="border: 1px solid black; text-align:left;">Tugas Luar</td>
         <td colspan="15" class="no-border"></td>
      </tr>
      <tr>
         <td colspan="1" style="border: 1px solid black; text-align:center;">I</td>
         <td colspan="5" style="border: 1px solid black; text-align:left;">Izin</td>
         <td colspan="15" class="no-border"></td>
      </tr>
      <tr>
         <td colspan="1" style="border: 1px solid black; text-align:center;">S</td>
         <td colspan="5" style="border: 1px solid black; text-align:left;">Sakit</td>
         <td colspan="9" class="no-border"></td>
         <td colspan="6" class="no-border" align="center" style="font-weight: bold; text-decoration: underline; padding-top: 40px;">${kepsekData.name}</td>
      </tr>
      <tr>
         <td colspan="1" style="border: 1px solid black; text-align:center;">A</td>
         <td colspan="5" style="border: 1px solid black; text-align:left;">Tanpa Keterangan</td>
         <td colspan="9" class="no-border"></td>
         <td colspan="6" class="no-border" align="center">NIP. ${kepsekData.nip}</td>
      </tr>
    </table></body></html>`

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Laporan_Pegawai_${summary.periodStr.replace(/\s+/g, '_')}.xls`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDownloadPDF = () => {
    showNotification('Membuka jendela cetak PDF...', 'success')
    const kepsekData = getKepalaSekolahData()
    const { reportData, summary } = generateEmployeeReportData()
    const printWindow = window.open('', '_blank')

    const htmlContent = `<html><head><title>Laporan Absensi - SMP NEGERI 1 LEMBO</title>
      <style>
        @page { size: landscape; margin: 10mm; } 
        body { font-family: sans-serif; padding: 0; margin: 0; color: #333; } 
        .laporan-title { text-align: center; margin-bottom: 20px; } 
        .laporan-title h2 { margin: 0 0 5px 0; font-size: 16px; text-transform: uppercase; text-decoration: underline; } 
        .laporan-title p { margin: 0; font-size: 14px; } 
        table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-size: 10px; } 
        table.data-table th, table.data-table td { border: 1px solid #000; padding: 4px 2px; text-align: center; } 
        table.data-table th { background-color: #f1f5f9; font-weight: bold; } 
        .text-left { text-align: left !important; } 
        table.data-table tfoot th { background-color: #e2e8f0; font-size: 11px; } 
        .col-mgg { background-color: red !important; color: white !important; font-weight: bold; } 
        .footer-container { width: 100%; margin-top: 20px; display: block; clear: both; } 
        .legend-section { float: left; width: 40%; } 
        .legend-title { font-weight: bold; font-size: 12px; margin-bottom: 5px; } 
        .legend-table { border-collapse: collapse; font-size: 11px; width: 250px; } 
        .legend-table td { border: 1px solid #000; padding: 4px; text-align: left; } 
        .signature-section { float: right; width: 300px; text-align: center; page-break-inside: avoid; font-size: 12px; } 
        .signature-section p { margin: 2px 0; } 
        .signature-section .title { font-weight: bold; margin-bottom: 50px; } 
        .signature-section .name { font-weight: bold; text-decoration: underline; } 
        .clearfix { clear: both; }
      </style></head><body>
      ${getKopHTMLTemplate()}
      <div class="laporan-title">
        <h2>Laporan Kehadiran Pegawai</h2>
        <p>Periode : ${summary.periodStr}</p>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>No</th>
            <th class="text-left">Nama Pegawai</th>
            <th>NIP / NIK</th>
            <th class="text-left">Jabatan</th>
            <th>Tanggal</th>
            <th>Jam Masuk</th>
            <th>Jam Pulang</th>
            <th class="col-mgg">Mgg</th>
            <th>Sen</th>
            <th>Sel</th>
            <th>Rab</th>
            <th>Kam</th>
            <th>Jum</th>
            <th>Sab</th>
            <th>Ket. Pulang</th>
            <th>Hadir</th>
            <th>Lambat</th>
            <th>Tugas Luar</th>
            <th>Izin</th>
            <th>Sakit</th>
            <th>Tanpa Keterangan</th>
          </tr>
        </thead>
        <tbody>
          ${reportData
            .map((row, index) => {
              const days = ['', '', '', '', '', '', '']
              days[row.dayOfWeek] = row.statusCode
              return `<tr>
              <td>${index + 1}</td>
              <td class="text-left">${row.name}</td>
              <td>${row.nip}</td>
              <td class="text-left">${row.dept}</td>
              <td>${row.date}</td>
              <td>${row.time}</td>
              <td>${row.timeKeluar}</td>
              <td class="col-mgg">${days[0]}</td>
              <td>${days[1]}</td>
              <td>${days[2]}</td>
              <td>${days[3]}</td>
              <td>${days[4]}</td>
              <td>${days[5]}</td>
              <td>${days[6]}</td>
              <td>${row.statusKeluar}</td>
              <td>${row.status === 'Hadir' ? '1' : ''}</td>
              <td>${row.status === 'Terlambat' ? '1' : ''}</td>
              <td>${row.status === 'Tugas Luar' ? '1' : ''}</td>
              <td>${row.status === 'Izin' ? '1' : ''}</td>
              <td>${row.status === 'Sakit' ? '1' : ''}</td>
              <td>${row.status === 'Alpa' ? '1' : ''}</td>
            </tr>`
            })
            .join('')}
        </tbody>
        <tfoot>
          <tr>
            <th colspan="15" style="text-align: right; padding-right: 15px;">TOTAL KESELURUHAN</th>
            <th>${summary.hadir}</th>
            <th>${summary.lambat}</th>
            <th>${summary.tugasLuar}</th>
            <th>${summary.izin}</th>
            <th>${summary.sakit}</th>
            <th>${summary.alpa}</th>
          </tr>
        </tfoot>
      </table>
      <div class="footer-container">
        <div class="legend-section">
          <div class="legend-title">Keterangan</div>
          <table class="legend-table">
            <tr><td style="width: 30px; text-align: center;">H1</td><td>Hadir Tepat Waktu</td></tr>
            <tr><td style="text-align: center;">HT</td><td>Hadir Terlambat</td></tr>
            <tr><td style="text-align: center;">TL</td><td>Tugas Luar</td></tr>
            <tr><td style="text-align: center;">I</td><td>Izin</td></tr>
            <tr><td style="text-align: center;">S</td><td>Sakit</td></tr>
            <tr><td style="text-align: center;">A</td><td>Tanpa Keterangan</td></tr>
          </table>
        </div>
        <div class="signature-section">
          <p>Lembo Raya, ${currentDateStr}</p>
          <p>Mengetahui,</p>
          <p class="title">Kepala Sekolah</p>
          <p class="name">${kepsekData.name}</p>
          <p>NIP. ${kepsekData.nip}</p>
        </div>
        <div class="clearfix"></div>
      </div>
      <script>window.onload = function() { window.print(); }</script></body></html>`

    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  const handleDownloadSPTJM = () => {
    showNotification('Membuka cetak SPTJM...', 'success')
    const kepsekData = getKepalaSekolahData()
    const { summary } = generateEmployeeReportData()
    const printWindow = window.open('', '_blank')
    const htmlContent = `<html><head><title>SPTJM - SMP NEGERI 1 LEMBO</title><style>body { font-family: 'Times New Roman', Times, serif; padding: 40px; color: #000; line-height: 1.6; } .title { text-align: center; margin-bottom: 30px; margin-top: 10px; } .title h2 { margin: 0; font-size: 18px; text-decoration: underline; text-transform: uppercase;} .content { text-align: justify; font-size: 14pt; } .signature-section { margin-top: 30px; float: right; width: 300px; text-align: left; font-size: 14pt; page-break-inside: avoid; } .signature-section .name { font-weight: bold; text-decoration: underline; margin-top: 60px; }</style></head><body>${getKopHTMLTemplate()}<div class="title"><h2>Surat Pernyataan Tanggung Jawab Mutlak (SPTJM)</h2><p style="margin-top: 5px; font-size: 14pt;">Nomor :.......................................</p></div><div class="content"><p>Yang bertanda tangan di bawah ini:</p><table style="margin-left: 20px; font-size: 14pt; margin-bottom: 20px; border: none;"><tr><td style="width: 150px; border:none; padding: 2px;">Nama</td><td style="border:none; padding: 2px;">: <b>${
      kepsekData.name
    }</b></td></tr><tr><td style="border:none; padding: 2px;">NIP</td><td style="border:none; padding: 2px;">: ${
      kepsekData.nip
    }</td></tr><tr><td style="border:none; padding: 2px;">Jabatan</td><td style="border:none; padding: 2px;">: Kepala Sekolah SMP NEGERI 1 LEMBO</td></tr></table><p>Menyatakan dengan sesungguhnya bahwa seluruh data rekapitulasi kehadiran pegawai pada SMP NEGERI 1 LEMBO untuk periode <b>${
      summary.periodStr
    }</b> adalah benar dan sesuai dengan kenyataan.</p><p>Apabila di kemudian hari terdapat kekeliruan atau ketidaksesuaian data absensi, saya bersedia mempertanggungjawabkannya sesuai ketentuan.</p><p>Demikian Surat Pernyataan Tanggung Jawab Mutlak ini dibuat dengan sadar untuk dipergunakan sebagaimana mestinya.</p></div><div class="signature-section"><p>Lembo Raya, ${currentDateStr}</p><p>Kepala Sekolah,</p><div class="name">${
      kepsekData.name
    }</div><p style="margin:0;">NIP. ${
      kepsekData.nip
    }</p></div><script>window.onload = function() { window.print(); }</script></body></html>`
    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  const handleDownloadStudentExcel = () => {
    try {
      showNotification('Memproses file Excel...', 'success')
      const { reportData, totals, periodStr } = generateStudentReportData()

      let tableHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <style>
            .table-bordered { border-collapse: collapse; width: 100%; }
            .table-bordered th, .table-bordered td { border: 1px solid black; padding: 5px; text-align: center; vertical-align: middle; }
            .text-left { text-align: left !important; }
            .no-border { border: none !important; }
            .kop-title { font-weight: bold; font-size: 14pt; }
            .kop-subtitle { font-weight: bold; font-size: 16pt; }
            .kop-text { font-size: 12pt; }
            .bg-header { background-color: #f3f3f3; font-weight: bold; }
            .bg-red-custom { background-color: red; color: white; font-weight: bold; }
          </style>
        </head>
        <body>
          <table class="no-border" style="width: 100%;">
            <tr><td colspan="20" align="center" class="no-border kop-text">PEMERINTAH KABUPATEN MOROWALI UTARA</td></tr>
            <tr><td colspan="20" align="center" class="no-border kop-title">DINAS PENDIDIKAN DAN KEBUDAYAAN DAERAH</td></tr>
            <tr><td colspan="20" align="center" class="no-border kop-subtitle">SMP NEGERI 1 LEMBO</td></tr>
            <tr><td colspan="20" align="center" class="no-border kop-text">Alamat : Kec. Lembo Raya, Kab. Morowali Utara</td></tr>
            <tr><td colspan="20" class="no-border"></td></tr>
            <tr><td colspan="20" align="center" class="no-border" style="font-weight: bold; font-size: 14pt;">LAPORAN ABSENSI SISWA</td></tr>
            <tr><td colspan="20" align="center" class="no-border">Periode: ${periodStr} ${
        filterKelas !== 'Semua' ? '(Kelas ' + filterKelas + ')' : ''
      }</td></tr>
            <tr><td colspan="20" class="no-border"></td></tr>
          </table>

          <table class="table-bordered">
            <thead>
              <tr class="bg-header">
                <th>No</th>
                <th class="text-left">Nama Siswa</th>
                <th>NISN / NIS</th>
                <th>Kelas</th>
                <th>Tanggal</th>
                <th>Jam Masuk</th>
                <th>Jam Pulang</th>
                <th class="bg-red-custom">Mgg</th>
                <th>Sen</th>
                <th>Sel</th>
                <th>Rab</th>
                <th>Kam</th>
                <th>Jum</th>
                <th>Sab</th>
                <th>Ket. Pulang</th>
                <th>Hadir</th>
                <th>Izin</th>
                <th>Sakit</th>
                <th>Alpa</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
      `

      reportData.forEach((row, index) => {
        const days = ['', '', '', '', '', '', '']
        days[row.dayOfWeek] = row.statusCode

        tableHtml += `
          <tr>
            <td>${index + 1}</td>
            <td class="text-left">${row.name}</td>
            <td style="mso-number-format:'\\@';">${row.nisn}</td> 
            <td>${row.kelas}</td>
            <td>${row.dateStr}</td>
            <td>${row.timeMasuk}</td>
            <td>${row.timePulang}</td>
            <td class="bg-red-custom">${days[0]}</td>
            <td>${days[1]}</td>
            <td>${days[2]}</td>
            <td>${days[3]}</td>
            <td>${days[4]}</td>
            <td>${days[5]}</td>
            <td>${days[6]}</td>
            <td>${row.statusKeluar}</td>
            <td>${row.status === 'Hadir' ? '1' : ''}</td>
            <td>${row.status === 'Izin' ? '1' : ''}</td>
            <td>${row.status === 'Sakit' ? '1' : ''}</td>
            <td>${row.status === 'Alpa' ? '1' : ''}</td>
            <td class="text-left">${row.keterangan}</td>
          </tr>
        `
      })

      tableHtml += `
            </tbody>
            <tfoot>
              <tr class="bg-header">
                <th colspan="15" style="text-align: right; padding-right: 15px;">TOTAL KESELURUHAN</th>
                <th>${totals.hadir}</th>
                <th>${totals.izin}</th>
                <th>${totals.sakit}</th>
                <th>${totals.alpa}</th>
                <th></th>
              </tr>
            </tfoot>
          </table>

          <br/>
          <table class="no-border" style="width: 100%; margin-top: 20px;">
            <tr>
               <td colspan="6" class="no-border text-left" style="font-weight: bold; font-size: 12pt;">Keterangan</td>
               <td colspan="8" class="no-border"></td>
               <td colspan="6" class="no-border" align="center">Lembo Raya, ${currentDateStr}</td>
            </tr>
            <tr>
               <td colspan="1" style="border: 1px solid black; text-align:center;">H</td>
               <td colspan="5" style="border: 1px solid black; text-align:left;">Hadir</td>
               <td colspan="8" class="no-border"></td>
               <td colspan="6" class="no-border" align="center">Guru Kelas / Pemindai,</td>
            </tr>
            <tr>
               <td colspan="1" style="border: 1px solid black; text-align:center;">I</td>
               <td colspan="5" style="border: 1px solid black; text-align:left;">Izin</td>
               <td colspan="14" class="no-border"></td>
            </tr>
            <tr>
               <td colspan="1" style="border: 1px solid black; text-align:center;">S</td>
               <td colspan="5" style="border: 1px solid black; text-align:left;">Sakit</td>
               <td colspan="8" class="no-border"></td>
               <td colspan="6" class="no-border" align="center" style="font-weight: bold; text-decoration: underline; padding-top: 40px;">${userName}</td>
            </tr>
            <tr>
               <td colspan="1" style="border: 1px solid black; text-align:center;">A</td>
               <td colspan="5" style="border: 1px solid black; text-align:left;">Alpa / Tanpa Keterangan</td>
               <td colspan="8" class="no-border"></td>
               <td colspan="6" class="no-border" align="center">NIP. ${userNip || '-'}</td>
            </tr>
          </table>
        </body>
        </html>
      `

      const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `Absensi_Siswa_${periodStr.replace(/\s+/g, '_')}${filterKelas !== 'Semua' ? '_Kls_' + filterKelas : ''}.xls`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      showNotification('Berhasil mengunduh Excel (.xls)', 'success')
    } catch (error) {
      showNotification('Gagal mengunduh file Excel', 'error')
    }
  }

  const handleDownloadStudentPDF = () => {
    try {
      showNotification('Membuka jendela cetak PDF...', 'success')
      const { reportData, totals, periodStr } = generateStudentReportData()

      const printWindow = window.open('', '_blank')
      const htmlContent = `
        <html>
          <head>
            <title>Laporan Absensi Siswa - SMP NEGERI 1 LEMBO</title>
            <style>
              @page { size: landscape; margin: 15mm; }
              body { font-family: sans-serif; padding: 0; margin: 0; color: #333; }
              .laporan-title { text-align: center; margin-bottom: 20px; }
              .laporan-title h2 { margin: 0 0 5px 0; font-size: 16px; text-transform: uppercase; text-decoration: underline; }
              .laporan-title p { margin: 0; font-size: 14px; }
              table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-size: 10px; }
              table.data-table th, table.data-table td { border: 1px solid #000; padding: 4px 2px; text-align: center; }
              table.data-table th { background-color: #f1f5f9; font-weight: bold; }
              .text-left { text-align: left !important; }
              table.data-table tfoot th { background-color: #e2e8f0; font-size: 11px; }
              .col-mgg { background-color: red !important; color: white !important; font-weight: bold; } 
              .footer-container { width: 100%; margin-top: 20px; display: block; clear: both; } 
              .legend-section { float: left; width: 40%; } 
              .legend-title { font-weight: bold; font-size: 12px; margin-bottom: 5px; } 
              .legend-table { border-collapse: collapse; font-size: 11px; width: 250px; } 
              .legend-table td { border: 1px solid #000; padding: 4px; text-align: left; } 
              .signature-section { float: right; width: 300px; text-align: center; page-break-inside: avoid; font-size: 12px; } 
              .signature-section p { margin: 2px 0; } 
              .signature-section .title { font-weight: bold; margin-bottom: 50px; } 
              .signature-section .name { font-weight: bold; text-decoration: underline; } 
              .clearfix { clear: both; }
            </style>
          </head>
          <body>
            ${getKopHTMLTemplate()}
            
            <div class="laporan-title">
              <h2>Laporan Absensi Siswa</h2>
              <p>Periode : ${periodStr} ${filterKelas !== 'Semua' ? '(Kelas ' + filterKelas + ')' : ''}</p>
            </div>
            
            <table class="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th class="text-left">Nama Siswa</th>
                  <th>NISN / NIS</th>
                  <th>Kelas</th>
                  <th>Tanggal</th>
                  <th>Jam Masuk</th>
                  <th>Jam Pulang</th>
                  <th class="col-mgg">Mgg</th>
                  <th>Sen</th>
                  <th>Sel</th>
                  <th>Rab</th>
                  <th>Kam</th>
                  <th>Jum</th>
                  <th>Sab</th>
                  <th>Ket. Pulang</th>
                  <th>Hadir</th>
                  <th>Izin</th>
                  <th>Sakit</th>
                  <th>Alpa</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                ${reportData
                  .map((row, index) => {
                    const days = ['', '', '', '', '', '', '']
                    days[row.dayOfWeek] = row.statusCode
                    return `
                  <tr>
                    <td>${index + 1}</td>
                    <td class="text-left">${row.name}</td>
                    <td>${row.nisn}</td>
                    <td>${row.kelas}</td>
                    <td>${row.dateStr}</td>
                    <td>${row.timeMasuk}</td>
                    <td>${row.timePulang}</td>
                    <td class="col-mgg">${days[0]}</td>
                    <td>${days[1]}</td>
                    <td>${days[2]}</td>
                    <td>${days[3]}</td>
                    <td>${days[4]}</td>
                    <td>${days[5]}</td>
                    <td>${days[6]}</td>
                    <td>${row.statusKeluar}</td>
                    <td>${row.status === 'Hadir' ? '1' : ''}</td>
                    <td>${row.status === 'Izin' ? '1' : ''}</td>
                    <td>${row.status === 'Sakit' ? '1' : ''}</td>
                    <td>${row.status === 'Alpa' ? '1' : ''}</td>
                    <td class="text-left">${row.keterangan}</td>
                  </tr>
                `
                  })
                  .join('')}
                ${
                  reportData.length === 0
                    ? '<tr><td colspan="20">Belum ada data absensi pada periode ini.</td></tr>'
                    : ''
                }
              </tbody>
              <tfoot>
                <tr>
                  <th colspan="15" style="text-align: right; padding-right: 15px;">TOTAL KESELURUHAN</th>
                  <th>${totals.hadir}</th>
                  <th>${totals.izin}</th>
                  <th>${totals.sakit}</th>
                  <th>${totals.alpa}</th>
                  <th></th>
                </tr>
              </tfoot>
            </table>
            
            <div class="footer-container">
              <div class="legend-section">
                <div class="legend-title">Keterangan</div>
                <table class="legend-table">
                  <tr><td style="width: 30px; text-align: center;">H</td><td>Hadir</td></tr>
                  <tr><td style="text-align: center;">I</td><td>Izin</td></tr>
                  <tr><td style="text-align: center;">S</td><td>Sakit</td></tr>
                  <tr><td style="text-align: center;">A</td><td>Alpa / Tanpa Keterangan</td></tr>
                </table>
              </div>
              <div class="signature-section">
                <p>Lembo Raya, ${currentDateStr}</p>
                <p>Guru Kelas / Pemindai,</p>
                <p class="name" style="margin-top: 50px;">${userName}</p>
                <p>NIP. ${userNip || '-'}</p>
              </div>
              <div class="clearfix"></div>
            </div>
            
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `
      printWindow.document.open()
      printWindow.document.write(htmlContent)
      printWindow.document.close()
    } catch (error) {
      showNotification('Gagal membuka fitur cetak', 'error')
    }
  }

  const renderParentPortal = () => {
    const studentInfo = students.find(s => String(s.nisn) === String(searchedNisn))
    const history = studentLogs.filter(l => String(l.nisn) === String(searchedNisn))

    const todayStr = new Date().toDateString()
    const nowHour = new Date().getHours()

    const dailyLogs = {}
    history.forEach(log => {
      const d = new Date(log.timestamp)
      const dStr = d.toDateString()
      if (!dailyLogs[dStr]) dailyLogs[dStr] = { logs: [], dateObj: d, rawLogs: [] }
      dailyLogs[dStr].logs.push(log)
      dailyLogs[dStr].rawLogs.push(log)
    })

    // Inject approved leaves
    history.forEach(log => {
      if (['Izin', 'Sakit'].includes(log.type) && log.approvalStatus === 'Disetujui' && log.startDate && log.endDate) {
        let current = new Date(log.startDate)
        current.setHours(0, 0, 0, 0)
        const end = new Date(log.endDate)
        end.setHours(0, 0, 0, 0)
        while (current <= end) {
          if (current.getDay() !== 0) {
            // Skip Sunday
            const dStr = current.toDateString()
            if (!dailyLogs[dStr]) dailyLogs[dStr] = { logs: [], dateObj: new Date(current), rawLogs: [] }
            dailyLogs[dStr].approvedLeave = log
          }
          current.setDate(current.getDate() + 1)
        }
      }
    })

    const processedHistory = Object.values(dailyLogs).map(dayData => {
      const dStr = dayData.dateObj.toDateString()
      let status = 'Alpa'
      let timeMasuk = '-'
      let timePulang = '-'
      let badgeColor = 'bg-red-100 text-red-700'
      let ket = ''
      let scannedByMasuk = '-'
      let scannedByPulang = '-'

      if (dayData.approvedLeave) {
        status = dayData.approvedLeave.type
        badgeColor = status === 'Izin' ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'
        const approverName = dayData.approvedLeave.approvedBy || 'Guru'
        ket = dayData.approvedLeave.alasan
          ? `"${dayData.approvedLeave.alasan}" (Disetujui: ${approverName})`
          : `Disetujui: ${approverName}`

        const masukLog = dayData.logs.find(l => l.type === 'Masuk')
        if (masukLog) {
          timeMasuk = formatTime(new Date(masukLog.timestamp)).substring(0, 5)
          timePulang = 'Hadir'
          scannedByMasuk = masukLog.scannedBy || '-'
          status = 'Hadir'
          badgeColor = 'bg-green-100 text-green-700'
        } else {
          timeMasuk = dayData.approvedLeave.type
          timePulang = dayData.approvedLeave.type
        }
      } else {
        const masukLog = dayData.logs.find(l => l.type === 'Masuk')
        const pulangLog = dayData.logs.find(l => l.type === 'Pulang')

        if (masukLog) {
          timeMasuk = formatTime(new Date(masukLog.timestamp)).substring(0, 5)
          scannedByMasuk = masukLog.scannedBy || '-'
        }
        if (pulangLog) {
          timePulang = formatTime(new Date(pulangLog.timestamp)).substring(0, 5)
          scannedByPulang = pulangLog.scannedBy || '-'
        }

        if (masukLog && pulangLog) {
          status = 'Hadir'
          badgeColor = 'bg-green-100 text-green-700'
        } else if (masukLog && !pulangLog) {
          if (dStr === todayStr && nowHour < 13) {
            status = 'Hadir' // Belum pulang
            badgeColor = 'bg-blue-100 text-blue-700'
            timePulang = 'Belum Pulang'
          } else {
            status = 'Alpa (Tdk Absen Pulang)'
            badgeColor = 'bg-red-100 text-red-700'
          }
        }
      }

      return {
        dateObj: dayData.dateObj,
        dateStr: formatDate(dayData.dateObj),
        status,
        badgeColor,
        timeMasuk,
        timePulang,
        ket,
        scannedByMasuk,
        scannedByPulang,
        photoUrl: dayData.approvedLeave?.photoUrl || null,
      }
    })

    processedHistory.sort((a, b) => b.dateObj - a.dateObj) // Sort descending

    let countHadir = 0,
      countIzin = 0,
      countSakit = 0,
      countAlpha = 0
    processedHistory.forEach(item => {
      if (
        item.dateObj.getMonth() === new Date().getMonth() &&
        item.dateObj.getFullYear() === new Date().getFullYear()
      ) {
        if (item.status === 'Hadir') countHadir++
        else if (item.status === 'Izin') countIzin++
        else if (item.status === 'Sakit') countSakit++
        else if (item.status.includes('Alpa')) countAlpha++
      }
    })

    const todayDateObj = new Date()
    const todayString = `${todayDateObj.getFullYear()}-${String(todayDateObj.getMonth() + 1).padStart(2, '0')}-${String(
      todayDateObj.getDate()
    ).padStart(2, '0')}`

    return (
      <div
        className="flex flex-col items-center min-h-screen p-6 w-full animate-fade-in relative"
        style={{
          backgroundColor: '#f8fafc',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='138.56' viewBox='0 0 80 138.56' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23cbd5e1' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M40 23.09L0 46.19v46.19L40 115.47l40-23.09V46.19L40 23.09z'/%3E%3Cpath d='M40 69.28v46.19M0 46.19l40 23.09 40-23.09M40 23.09V-23.09M-40 115.47L0 92.38M120 115.47l-40-23.09'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '80px 138.56px',
          backgroundPosition: 'center',
        }}
      >
        <div className="w-full max-w-md pb-20 relative z-10">
          <button
            onClick={() => {
              setIsParentMode(false)
              setSearchedNisn('')
              setParentInputNisn('')
            }}
            className="mb-6 flex items-center text-sm font-bold text-gray-500 hover:text-gray-800 transition bg-white/80 p-2 rounded-xl backdrop-blur-sm w-max"
          >
            <Home size={16} className="mr-1" /> Kembali ke Login
          </button>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Portal Orang Tua</h2>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Pantau riwayat kehadiran anak Anda di sekolah dengan memasukkan Nomor Induk Siswa Nasional (NISN).
            </p>
            <form
              onSubmit={e => {
                e.preventDefault()
                setSearchedNisn(parentInputNisn)
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-3.5 text-gray-400" />
                <input
                  type="text"
                  value={parentInputNisn}
                  onChange={e => setParentInputNisn(e.target.value)}
                  placeholder="Ketik NISN..."
                  className="w-full pl-10 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-200"
              >
                <Search size={20} />
              </button>
            </form>
          </div>

          {searchedNisn && !studentInfo && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-center text-sm font-medium animate-slide-down">
              Data siswa dengan NISN "{String(searchedNisn)}" tidak ditemukan.
            </div>
          )}

          {searchedNisn && studentInfo && (
            <div className="animate-slide-down">
              <div className="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-3xl p-6 text-white shadow-lg mb-6 flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  {studentInfo.photoUrl ? (
                    <img src={studentInfo.photoUrl} className="w-full h-full object-cover rounded-full" alt="Siswa" />
                  ) : (
                    <GraduationCap size={32} />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight mb-1">{String(studentInfo.name)}</h3>
                  <p className="text-white/80 text-xs">
                    NISN: {String(studentInfo.nisn)} • Kelas {String(studentInfo.kelas)}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <LayoutDashboard size={16} className="text-indigo-600" /> Rekap Bulan Ini
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-green-50 border border-green-100 p-2 rounded-xl text-center">
                    <p className="text-xl font-black text-green-700">{countHadir}</p>
                    <p className="text-[9px] font-bold text-green-600 uppercase tracking-tight mt-0.5">Hadir</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 p-2 rounded-xl text-center">
                    <p className="text-xl font-black text-orange-700">{countIzin}</p>
                    <p className="text-[9px] font-bold text-orange-600 uppercase tracking-tight mt-0.5">Izin</p>
                  </div>
                  <div className="bg-teal-50 border border-teal-100 p-2 rounded-xl text-center">
                    <p className="text-xl font-black text-teal-700">{countSakit}</p>
                    <p className="text-[9px] font-bold text-teal-600 uppercase tracking-tight mt-0.5">Sakit</p>
                  </div>
                  <div className="bg-red-50 border border-red-100 p-2 rounded-xl text-center">
                    <p className="text-xl font-black text-red-700">{countAlpha}</p>
                    <p className="text-[9px] font-bold text-red-600 uppercase tracking-tight mt-0.5">Alpa</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => {
                    setParentSpecialData({
                      type: 'Izin',
                      photoBase64: null,
                      fileName: '',
                      alasan: '',
                      startDate: '',
                      endDate: '',
                    })
                    setShowParentSpecialModal(true)
                  }}
                  className="flex flex-col items-center justify-center p-3 bg-orange-50 hover:bg-orange-100 border border-orange-100 rounded-2xl transition"
                >
                  <FileText size={24} className="text-orange-600 mb-1" />
                  <span className="text-[11px] font-bold text-orange-800 text-center leading-tight">Ajukan Izin</span>
                </button>
                <button
                  onClick={() => {
                    setParentSpecialData({
                      type: 'Sakit',
                      photoBase64: null,
                      fileName: '',
                      alasan: '',
                      startDate: '',
                      endDate: '',
                    })
                    setShowParentSpecialModal(true)
                  }}
                  className="flex flex-col items-center justify-center p-3 bg-teal-50 hover:bg-teal-100 border border-teal-100 rounded-2xl transition"
                >
                  <Activity size={24} className="text-teal-600 mb-1" />
                  <span className="text-[11px] font-bold text-teal-800 text-center leading-tight">Lapor Sakit</span>
                </button>
              </div>

              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Clock size={16} className="text-indigo-600" /> Riwayat Kehadiran Terbaru
              </h3>

              <div className="space-y-3 pb-10">
                {processedHistory.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-6 bg-white rounded-xl border border-dashed border-gray-200">
                    Belum ada riwayat absensi.
                  </p>
                ) : (
                  processedHistory.slice(0, 15).map((log, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <p className="font-bold text-gray-800 text-sm">{log.dateStr}</p>
                        <span
                          className={`text-[9px] font-bold px-2 py-1 rounded-md ${log.badgeColor} text-right w-max leading-tight`}
                        >
                          {log.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg mb-1 border border-gray-100">
                        <div>
                          <p className="text-[10px] text-gray-500 font-semibold mb-0.5">Absen Masuk</p>
                          <p className="text-sm font-bold text-gray-800">{log.timeMasuk}</p>
                          {log.scannedByMasuk !== '-' && (
                            <p className="text-[8px] text-gray-400 mt-1">Oleh: {log.scannedByMasuk}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 font-semibold mb-0.5">Absen Pulang</p>
                          <p className="text-sm font-bold text-gray-800">{log.timePulang}</p>
                          {log.scannedByPulang !== '-' && (
                            <p className="text-[8px] text-gray-400 mt-1">Oleh: {log.scannedByPulang}</p>
                          )}
                        </div>
                      </div>

                      {log.photoUrl && (
                        <button
                          onClick={() => setPreviewImage(log.photoUrl)}
                          className="mt-2 flex items-center gap-1.5 text-[10px] text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg w-max border border-indigo-100 hover:bg-indigo-100 transition-colors font-bold"
                        >
                          <ImageIcon size={12} /> Lihat Surat/Bukti
                        </button>
                      )}
                      {log.ket && (
                        <p className="mt-2 text-[10px] text-gray-500 italic px-2 border-l-2 border-gray-300">
                          {log.ket}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderLogin = () => (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 w-full animate-fade-in relative"
      style={{
        backgroundColor: '#f8fafc',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='138.56' viewBox='0 0 80 138.56' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23cbd5e1' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M40 23.09L0 46.19v46.19L40 115.47l40-23.09V46.19L40 23.09z'/%3E%3Cpath d='M40 69.28v46.19M0 46.19l40 23.09 40-23.09M40 23.09V-23.09M-40 115.47L0 92.38M120 115.47l-40-23.09'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: '80px 138.56px',
        backgroundPosition: 'center',
      }}
    >
      <div className="w-full max-w-md bg-white/95 backdrop-blur-sm p-8 sm:p-10 rounded-[2rem] shadow-2xl border border-white relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4 shadow-inner overflow-hidden flex-shrink-0">
          {logos.sek ? <img src={logos.sek} className="w-14 h-14 object-contain" alt="Logo" /> : <School size={40} />}
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1 text-center">SMP NEGERI 1 LEMBO</h1>
        <h2 className="text-md text-blue-600 font-semibold mb-2">Aplikasi Absensi</h2>
        <p className="text-gray-500 mb-6 text-center text-sm">Silakan masukkan NIP/NIK dan Password Anda</p>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">NIP / NIK</label>
              {isDbConnected ? (
                <span className="text-[10px] text-green-500 font-medium flex items-center gap-1">
                  <CheckCircle size={10} /> Terhubung ke Server
                </span>
              ) : (
                <span className="text-[10px] text-orange-500 font-medium flex items-center gap-1 animate-pulse">
                  <RefreshCw size={10} className="animate-spin" /> Menghubungkan...
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={credentials.nip}
                onChange={e => setCredentials({ ...credentials, nip: e.target.value })}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors bg-gray-50 focus:bg-white"
                placeholder="Masukkan NIP / NIK"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-400" />
              </div>
              <input
                type={showPasswordLogin ? 'text' : 'password'}
                value={credentials.password}
                onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors bg-gray-50 focus:bg-white"
                placeholder="Masukkan Password"
              />
              <button
                type="button"
                onClick={() => setShowPasswordLogin(!showPasswordLogin)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPasswordLogin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="flex justify-between mt-2 px-1">
              <button
                type="button"
                onClick={() => setIsParentMode(true)}
                className="text-[11px] text-blue-600 font-semibold hover:underline"
              >
                Masuk sbg Orang Tua
              </button>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-[11px] text-blue-600 font-semibold hover:underline"
              >
                Lupa Password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-95"
          >
            {isLoading ? <RefreshCw className="animate-spin" size={20} /> : 'Masuk Aplikasi'}
          </button>

          {isInstallable && (
            <button
              type="button"
              onClick={handleInstallApp}
              className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 px-4 rounded-xl mt-2 transition-colors flex items-center justify-center gap-2 border border-indigo-100"
            >
              <Download size={20} />
              Instal Aplikasi ke HP
            </button>
          )}
        </form>
      </div>
    </div>
  )

  const renderHome = () => {
    const hour = currentTime.getHours()
    const minute = currentTime.getMinutes()
    const currentDay = currentTime.getDay()
    const isMasukTime = hour === 6 || hour === 7 || (hour === 8 && minute === 0)
    const isHTTime = (hour === 8 && minute > 0) || (hour === 9 && minute === 0)

    let isKeluarTime = false
    let keluarText = '13:00'

    if (currentDay === 5) {
      // Jumat
      isKeluarTime = hour >= 11
      keluarText = '11:00'
    } else if (currentDay === 6) {
      // Sabtu
      isKeluarTime = hour > 11 || (hour === 11 && minute >= 50)
      keluarText = '11:50'
    } else {
      // Senin - Kamis (0, 1, 2, 3, 4)
      isKeluarTime = hour >= 13
      keluarText = '13:00'
    }

    const isMainButtonDisabled = (!isCheckedIn && !isMasukTime) || (isCheckedIn && !isKeluarTime)

    const currentUserData = employees.find(e => String(e.nip) === String(userNip))
    const isGuru = currentUserData?.dept === 'Guru'
    const isKepsek = currentUserData?.dept === 'Kepala Sekolah'

    const myPendingEmpLogsCount = isKepsek
      ? logs.filter(l => l.approvalStatus === 'Menunggu Persetujuan Kepsek').length
      : 0
    const myPendingStudentLogsCount =
      isGuru || isKepsek ? studentLogs.filter(l => l.approvalStatus === 'Menunggu Persetujuan Guru').length : 0
    const totalMyPending = myPendingEmpLogsCount + myPendingStudentLogsCount

    // Menghitung rekap absensi untuk pegawai yang sedang login
    const { reportData } = generateEmployeeReportData()
    const myReportData = reportData.filter(r => String(r.nip) === String(userNip))
    const myStats = {
      hadir: myReportData.filter(r => r.status === 'Hadir').length,
      lambat: myReportData.filter(r => r.status === 'Terlambat').length,
      tugasLuar: myReportData.filter(r => r.status === 'Tugas Luar').length,
      izin: myReportData.filter(r => r.status === 'Izin').length,
      sakit: myReportData.filter(r => r.status === 'Sakit').length,
      alpa: myReportData.filter(r => r.status === 'Alpa').length,
    }

    const pendingTugasLuar = myLogs.some(
      l => l.type === 'Tugas Luar' && l.approvalStatus === 'Menunggu Persetujuan Kepsek'
    )
    const pendingIzin = myLogs.some(l => l.type === 'Izin' && l.approvalStatus === 'Menunggu Persetujuan Kepsek')
    const pendingSakit = myLogs.some(l => l.type === 'Sakit' && l.approvalStatus === 'Menunggu Persetujuan Kepsek')

    const htCountThisMonth = myLogs.filter(l => {
      const d = new Date(l.timestamp)
      return (
        l.type === 'Hadir Terlambat' &&
        d.getMonth() === currentTime.getMonth() &&
        d.getFullYear() === currentTime.getFullYear()
      )
    }).length

    const rejectedToday = myLogs.find(
      l =>
        ['Izin', 'Sakit', 'Tugas Luar'].includes(l.type) &&
        l.approvalStatus === 'Ditolak' &&
        isDateInRange(currentTime, l.startDate, l.endDate)
    )

    return (
      <div className="flex flex-col p-4 w-full animate-fade-in items-center">
        <div className="w-full flex justify-between items-start mb-4">
          <div>
            <h2 className="text-gray-500 text-xs">Halo, Selamat Pagi</h2>
            <h1 className="text-lg font-bold text-gray-800 line-clamp-1">{String(userName)}</h1>
            <p className="text-blue-600 text-[10px] font-semibold">{String(userNip)}</p>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-sm shrink-0 overflow-hidden">
            {employees.find(e => String(e.nip) === String(userNip))?.photoUrl ? (
              <img
                src={employees.find(e => String(e.nip) === String(userNip)).photoUrl}
                className="w-full h-full object-cover"
                alt="Profile"
              />
            ) : (
              <User size={20} />
            )}
          </div>
        </div>

        {totalMyPending > 0 && (
          <button
            onClick={() => setActiveTab('approvals')}
            className="w-full bg-orange-50 border border-orange-200 p-3 rounded-xl mb-4 flex items-center justify-between shadow-sm animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                <CheckSquare size={16} />
              </div>
              <div className="text-left">
                <h3 className="text-orange-800 font-bold text-xs">Menunggu Persetujuan</h3>
                <p className="text-orange-600 text-[10px]">Ada {totalMyPending} pengajuan perlu diverifikasi.</p>
              </div>
            </div>
          </button>
        )}

        <div className="bg-white w-full rounded-xl shadow-sm p-4 mb-5 text-center border border-gray-100">
          <p className="text-gray-500 text-[11px] mb-1">{String(formatDate(currentTime))}</p>
          <h1 className="text-4xl font-mono font-bold text-gray-800 tracking-wider">
            {String(formatTime(currentTime))}
          </h1>
          <p className="text-[10px] text-gray-400 mt-1">Waktu Indonesia Tengah</p>
        </div>

        <div className="flex flex-col items-center justify-center mb-5">
          <button
            onClick={() => {
              setPendingAbsen(null)
              setShowCamera(true)
            }}
            disabled={isMainButtonDisabled}
            className={`relative w-32 h-32 rounded-full flex flex-col items-center justify-center text-white shadow-xl transition-all transform active:scale-95
              ${
                isMainButtonDisabled && !isLoading
                  ? 'bg-gray-400 cursor-not-allowed shadow-none'
                  : isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : isCheckedIn
                  ? 'bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 shadow-red-500/30'
                  : 'bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-blue-500/30'
              }`}
          >
            {isLoading ? (
              <RefreshCw size={28} className="animate-spin mb-1" />
            ) : !isCheckedIn && !isMasukTime ? (
              <Lock size={28} className="mb-1" />
            ) : isCheckedIn && !isKeluarTime ? (
              <Lock size={28} className="mb-1" />
            ) : (
              <Camera size={28} className="mb-1" />
            )}
            <span className="text-base font-bold uppercase tracking-wide mt-1">
              {isLoading
                ? 'Proses...'
                : !isCheckedIn
                ? isMasukTime
                  ? 'Masuk'
                  : 'Ditutup'
                : isKeluarTime
                ? 'Keluar'
                : 'Terkunci'}
            </span>
          </button>
          <p className="text-[10px] text-gray-400 mt-3 font-medium text-center">
            {!isCheckedIn ? 'Absen Masuk dibuka pukul 06:00 - 08:00' : `Absen Keluar dibuka pukul ${keluarText}`}
          </p>

          {todayLog && (
            <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-2 w-full max-w-xs text-center animate-fade-in">
              <p className="text-[9px] font-bold text-blue-800 mb-0.5 uppercase tracking-wider">
                Lokasi Absen {String(todayLog.type)}
              </p>
              <p className="text-[10px] text-blue-600 flex items-start justify-center gap-1">
                <MapPin size={12} className="flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2 leading-tight text-left">{String(todayLog.location)}</span>
              </p>
            </div>
          )}

          {/* Fitur Hadir Terlambat (HT) - Hanya Muncul Jika Belum Absen, Waktu Normal Ditutup, antara Jam 08.01 dan 09.00 */}
          {!isCheckedIn && !isMasukTime && !todayLog && isHTTime && (
            <div className="mt-4 w-full max-w-xs animate-slide-down">
              <button
                onClick={() => {
                  if (htCountThisMonth >= 2) {
                    showNotification('Batas penggunaan Hadir Terlambat (2x) telah habis bulan ini.', 'error')
                    return
                  }
                  setPendingAbsen({ type: 'Hadir Terlambat' })
                  setShowCamera(true)
                }}
                disabled={htCountThisMonth >= 2 || isLoading}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-sm border ${
                  htCountThisMonth >= 2
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200 shadow-yellow-100'
                }`}
              >
                {htCountThisMonth >= 2 ? <Lock size={16} /> : <AlertCircle size={16} />}
                <span className="text-xs">
                  {htCountThisMonth >= 2
                    ? 'HT Terkunci (Batas 2x Habis)'
                    : `Hadir Terlambat (Sisa ${2 - htCountThisMonth}x)`}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Banner Penolakan */}
        {rejectedToday && (
          <div className="w-full bg-red-50 border border-red-200 p-3 rounded-xl mb-4 flex items-start gap-3 shadow-sm animate-slide-down">
            <div className="bg-red-100 text-red-600 p-1.5 rounded-lg shrink-0 mt-0.5">
              <XCircle size={18} />
            </div>
            <div>
              <h3 className="text-red-800 text-xs font-bold leading-tight mb-1">
                Maaf, Pengajuan {rejectedToday.type} Anda tidak di ACC!
              </h3>
              <p className="text-[10px] text-red-600 leading-tight">
                Pengajuan telah ditolak oleh Kepala Sekolah. Anda otomatis akan tercatat sebagai Alpa (Tanpa Keterangan)
                pada tanggal tersebut.
              </p>
            </div>
          </div>
        )}

        <div className="w-full mt-1 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-gray-700">Laporan Khusus</h3>
            <span className="text-[9px] text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded-md">Wajib Dokumen</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                if (pendingTugasLuar) {
                  showNotification('Pengajuan Tugas Luar masih Menunggu ACC', 'error')
                  return
                }
                setSpecialAbsenData({
                  type: 'Tugas Luar',
                  file: null,
                  fileName: '',
                  photoBase64: null,
                  alasan: '',
                  startDate: '',
                  endDate: '',
                })
                setShowSpecialModal(true)
              }}
              className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition border ${
                pendingTugasLuar
                  ? 'bg-gray-100 border-gray-200 opacity-70 cursor-not-allowed'
                  : 'bg-purple-50 hover:bg-purple-100 border-purple-100'
              }`}
            >
              {pendingTugasLuar ? (
                <Lock size={20} className="text-gray-400 mb-1" />
              ) : (
                <Briefcase size={20} className="text-purple-600 mb-1" />
              )}
              <span
                className={`text-[10px] font-bold text-center leading-tight ${
                  pendingTugasLuar ? 'text-gray-500' : 'text-purple-800'
                }`}
              >
                Tugas Luar
              </span>
              {pendingTugasLuar && (
                <span className="absolute -bottom-2 bg-gray-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm w-max whitespace-nowrap">
                  Terkunci
                </span>
              )}
            </button>
            <button
              onClick={() => {
                if (pendingIzin) {
                  showNotification('Pengajuan Izin masih Menunggu ACC', 'error')
                  return
                }
                setSpecialAbsenData({
                  type: 'Izin',
                  file: null,
                  fileName: '',
                  photoBase64: null,
                  alasan: '',
                  startDate: '',
                  endDate: '',
                })
                setShowSpecialModal(true)
              }}
              className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition border ${
                pendingIzin
                  ? 'bg-gray-100 border-gray-200 opacity-70 cursor-not-allowed'
                  : 'bg-orange-50 hover:bg-orange-100 border-orange-100'
              }`}
            >
              {pendingIzin ? (
                <Lock size={20} className="text-gray-400 mb-1" />
              ) : (
                <FileText size={20} className="text-orange-600 mb-1" />
              )}
              <span
                className={`text-[10px] font-bold text-center leading-tight ${
                  pendingIzin ? 'text-gray-500' : 'text-orange-800'
                }`}
              >
                Izin
              </span>
              {pendingIzin && (
                <span className="absolute -bottom-2 bg-gray-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm w-max whitespace-nowrap">
                  Terkunci
                </span>
              )}
            </button>
            <button
              onClick={() => {
                if (pendingSakit) {
                  showNotification('Pengajuan Sakit masih Menunggu ACC', 'error')
                  return
                }
                setSpecialAbsenData({
                  type: 'Sakit',
                  file: null,
                  fileName: '',
                  photoBase64: null,
                  alasan: '',
                  startDate: '',
                  endDate: '',
                })
                setShowSpecialModal(true)
              }}
              className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition border ${
                pendingSakit
                  ? 'bg-gray-100 border-gray-200 opacity-70 cursor-not-allowed'
                  : 'bg-teal-50 hover:bg-teal-100 border-teal-100'
              }`}
            >
              {pendingSakit ? (
                <Lock size={20} className="text-gray-400 mb-1" />
              ) : (
                <Activity size={20} className="text-teal-600 mb-1" />
              )}
              <span
                className={`text-[10px] font-bold text-center leading-tight ${
                  pendingSakit ? 'text-gray-500' : 'text-teal-800'
                }`}
              >
                Sakit
              </span>
              {pendingSakit && (
                <span className="absolute -bottom-2 bg-gray-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm w-max whitespace-nowrap">
                  Terkunci
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Panel Rekap Kehadiran (Bulan Ini) */}
        <div className="w-full mt-2 mb-2">
          <h3 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
            <ClipboardList size={14} className="text-blue-600" /> Rekap Kehadiran (Bulan Ini)
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-50 border border-green-100 p-1.5 rounded-lg text-center flex flex-col justify-center shadow-sm">
              <p className="text-lg font-black text-green-700 leading-tight">{myStats.hadir}</p>
              <p className="text-[8px] font-bold text-green-600 uppercase tracking-tight mt-0.5">Hadir</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 p-1.5 rounded-lg text-center flex flex-col justify-center shadow-sm">
              <p className="text-lg font-black text-yellow-700 leading-tight">{myStats.lambat}</p>
              <p className="text-[8px] font-bold text-yellow-600 uppercase tracking-tight mt-0.5">Terlambat</p>
            </div>
            <div className="bg-purple-50 border border-purple-100 p-1.5 rounded-lg text-center flex flex-col justify-center shadow-sm">
              <p className="text-lg font-black text-purple-700 leading-tight">{myStats.tugasLuar}</p>
              <p className="text-[8px] font-bold text-purple-600 uppercase tracking-tight mt-0.5">Tgs Luar</p>
            </div>
            <div className="bg-orange-50 border border-orange-100 p-1.5 rounded-lg text-center flex flex-col justify-center shadow-sm">
              <p className="text-lg font-black text-orange-700 leading-tight">{myStats.izin}</p>
              <p className="text-[8px] font-bold text-orange-600 uppercase tracking-tight mt-0.5">Izin</p>
            </div>
            <div className="bg-teal-50 border border-teal-100 p-1.5 rounded-lg text-center flex flex-col justify-center shadow-sm">
              <p className="text-lg font-black text-teal-700 leading-tight">{myStats.sakit}</p>
              <p className="text-[8px] font-bold text-teal-600 uppercase tracking-tight mt-0.5">Sakit</p>
            </div>
            <div className="bg-red-50 border border-red-100 p-1.5 rounded-lg text-center flex flex-col justify-center shadow-sm">
              <p className="text-lg font-black text-red-700 leading-tight">{myStats.alpa}</p>
              <p className="text-[8px] font-bold text-red-600 uppercase tracking-tight mt-0.5">Alpa</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderHistory = () => (
    <div className="flex flex-col p-4 sm:p-6 w-full pb-24 animate-fade-in">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Riwayat Absensi Saya</h2>

      {myLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <Clock size={48} className="mb-4 opacity-50" />
          <p>Belum ada riwayat absensi Anda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myLogs.map(log => (
            <div
              key={log.id}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4 relative overflow-hidden"
            >
              {['Izin', 'Sakit', 'Tugas Luar'].includes(log.type) && log.approvalStatus === 'Disetujui' && (
                <div className="absolute top-0 right-0 bg-green-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-bl-lg z-10">
                  Dihitung Hadir (Jam Pulang)
                </div>
              )}
              {log.photo ? (
                <img
                  src={log.photo}
                  alt="Selfie"
                  onClick={() => setPreviewImage(log.photo)}
                  className="w-12 h-12 rounded-xl object-cover border border-gray-200 shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                  title="Klik untuk memperbesar"
                />
              ) : (
                <div
                  className={`p-3 rounded-xl flex-shrink-0 ${
                    log.type === 'Masuk'
                      ? 'bg-blue-100 text-blue-600'
                      : log.type === 'Hadir Terlambat'
                      ? 'bg-yellow-100 text-yellow-600'
                      : log.type === 'Keluar'
                      ? 'bg-red-100 text-red-600'
                      : log.type === 'Tugas Luar'
                      ? 'bg-purple-100 text-purple-600'
                      : log.type === 'Izin'
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-teal-100 text-teal-600'
                  }`}
                >
                  {log.type === 'Masuk' && <LogIn size={20} />}
                  {log.type === 'Hadir Terlambat' && <LogIn size={20} />}
                  {log.type === 'Keluar' && <LogOut size={20} />}
                  {log.type === 'Tugas Luar' && <Briefcase size={20} />}
                  {log.type === 'Izin' && <FileText size={20} />}
                  {log.type === 'Sakit' && <Activity size={20} />}
                </div>
              )}

              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">Absen {String(log.type)}</h3>
                    {['Izin', 'Sakit', 'Tugas Luar'].includes(log.type) && log.approvalStatus && (
                      <span
                        className={`text-[9px] font-bold mt-0.5 inline-block ${
                          log.approvalStatus === 'Disetujui'
                            ? 'text-green-600'
                            : log.approvalStatus === 'Ditolak'
                            ? 'text-red-500'
                            : 'text-orange-500'
                        }`}
                      >
                        {log.approvalStatus} {log.approvedBy ? `oleh ${log.approvedBy}` : ''}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-gray-600">
                    {String(formatTime(new Date(log.timestamp)).substring(0, 5))}
                  </span>
                </div>

                {log.startDate && log.endDate ? (
                  <p className="text-[10px] text-gray-500 mb-1 mt-1 font-semibold bg-gray-50 p-1 rounded inline-block">
                    {String(log.startDate)} s/d {String(log.endDate)}
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-500 mb-1">{String(formatDate(new Date(log.timestamp)))}</p>
                )}

                <p className="text-[11px] text-gray-400 flex items-start gap-1 mt-1">
                  <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2 leading-tight">{String(log.location)}</span>
                </p>

                {log.document && (
                  <div className="inline-flex items-center gap-1 mt-2 bg-blue-50 text-blue-700 px-2 py-1 rounded-md max-w-full">
                    <Paperclip size={10} className="flex-shrink-0" />
                    <span className="text-[10px] font-semibold truncate">{String(log.document)}</span>
                  </div>
                )}
                {log.alasan && (
                  <p className="mt-1 text-[10px] text-gray-500 italic px-2 border-l-2 border-gray-200">
                    "{String(log.alasan)}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderScanQR = () => {
    return (
      <div className="flex flex-col p-6 w-full pb-32 animate-fade-in relative min-h-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Scan QR Siswa</h2>
            <p className="text-xs text-gray-500">Pindai Kartu Absensi Siswa</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
            <Scan size={24} />
          </div>
        </div>

        {/* Toggle Masuk / Pulang */}
        <div className="flex bg-gray-100 p-1.5 rounded-xl mb-6 shadow-inner">
          <button
            onClick={() => setScanMode('Masuk')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              scanMode === 'Masuk' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'
            }`}
          >
            Absen Masuk
          </button>
          <button
            onClick={() => setScanMode('Pulang')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              scanMode === 'Pulang' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'
            }`}
          >
            Absen Pulang
          </button>
        </div>

        {/* Scanner Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6 overflow-hidden">
          {!scriptLoaded ? (
            <div className="text-center text-gray-500 py-10 flex flex-col items-center">
              <RefreshCw className="animate-spin mb-2" size={24} />
              <p className="text-sm font-medium">Memuat modul kamera...</p>
            </div>
          ) : (
            <div id="qr-reader" className="w-full"></div>
          )}
        </div>

        {/* Filter & Cetak Laporan Siswa */}
        <div className="mt-2 mb-8 border-b border-gray-200 pb-6">
          <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ClipboardList size={18} className="text-indigo-600" /> Cetak Laporan Siswa
          </h3>

          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bulan</label>
              <select
                value={filterMonth}
                onChange={e => setFilterMonth(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 font-medium"
              >
                {[
                  'Januari',
                  'Februari',
                  'Maret',
                  'April',
                  'Mei',
                  'Juni',
                  'Juli',
                  'Agustus',
                  'September',
                  'Oktober',
                  'November',
                  'Desember',
                ].map((m, i) => (
                  <option key={i} value={i + 1}>
                    {String(m)}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-[30%]">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tahun</label>
              <select
                value={filterYear}
                onChange={e => setFilterYear(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 font-medium"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>
                    {String(y)}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-[30%]">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Kelas</label>
              <select
                value={filterKelas}
                onChange={e => setFilterKelas(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 font-medium"
              >
                <option value="Semua">Semua</option>
                <option value="VII">VII</option>
                <option value="VIII">VIII</option>
                <option value="IX">IX</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownloadStudentPDF}
              className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold py-3 px-2 rounded-xl transition-colors border border-red-100"
            >
              <FileText size={18} />
              <span className="text-xs sm:text-sm">Unduh PDF</span>
            </button>
            <button
              onClick={handleDownloadStudentExcel}
              className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-600 hover:bg-green-100 font-bold py-3 px-2 rounded-xl transition-colors border border-green-100"
            >
              <FileSpreadsheet size={18} />
              <span className="text-xs sm:text-sm">Unduh Excel</span>
            </button>
          </div>
        </div>

        {/* Riwayat Scan Hari Ini */}
        <h3 className="text-md font-bold text-gray-800 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-indigo-600" /> Riwayat Scan Hari Ini
          </div>
        </h3>
        <div className="space-y-3">
          {studentLogs
            .filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString())
            .slice(0, 10)
            .map(log => (
              <div
                key={log.id}
                className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-gray-800">{String(log.name)}</span>
                  <span className="text-[10px] text-gray-500 mt-0.5">
                    Kelas {String(log.kelas)} • NISN: {String(log.nisn)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                        log.type === 'Masuk' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {String(log.type)}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-1">
                      {String(formatTime(new Date(log.timestamp)).substring(0, 5))}
                    </span>
                  </div>
                  {['admin', 'superadmin'].includes(userRole) && (
                    <div className="flex flex-col gap-1 ml-1 pl-2 border-l border-gray-100">
                      <button
                        onClick={() => handleDeleteStudentLog(log.id)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                        title="Hapus Riwayat Scan"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          {studentLogs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              Belum ada siswa yang discan hari ini.
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  const renderApprovals = () => {
    const currentUserData = employees.find(e => String(e.nip) === String(userNip))
    const isGuru = currentUserData?.dept === 'Guru'
    const isKepsek = currentUserData?.dept === 'Kepala Sekolah'
    const isAdmin = ['admin', 'superadmin'].includes(userRole)

    const pendingEmpLogs = logs.filter(l => l.approvalStatus === 'Menunggu Persetujuan Kepsek' && isKepsek)
    const pendingStudentLogs = studentLogs.filter(
      l =>
        (l.approvalStatus === 'Menunggu Persetujuan Guru' && (isGuru || isKepsek || isAdmin)) ||
        (l.approvalStatus === 'Menunggu Persetujuan Kepsek' && (isKepsek || isAdmin))
    )

    return (
      <div className="flex flex-col p-6 w-full pb-32 animate-fade-in">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Persetujuan Dokumen</h2>
        <p className="text-xs text-gray-500 mb-6">Tinjau dan setujui laporan Izin, Sakit, atau Tugas Luar.</p>

        {pendingEmpLogs.length === 0 && pendingStudentLogs.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
            <CheckCircle size={48} className="text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Bagus! Semua dokumen telah disetujui.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Daftar Pegawai */}
            {pendingEmpLogs.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-700 mb-3 text-sm flex items-center gap-2">
                  <Briefcase size={16} /> Pengajuan Pegawai/Guru
                </h3>
                <div className="space-y-3">
                  {pendingEmpLogs.map(log => (
                    <div
                      key={log.id}
                      className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{String(log.name)}</p>
                          <p className="text-[10px] text-gray-500">Pengajuan: {String(log.type)}</p>
                        </div>
                        <span className="text-[9px] font-bold bg-orange-100 text-orange-600 px-2 py-1 rounded">
                          Menunggu Kepsek
                        </span>
                      </div>
                      <p className="text-[10px] bg-gray-50 p-1.5 rounded text-gray-600 font-semibold mb-2 inline-block">
                        Tgl: {String(log.startDate)} s/d {String(log.endDate)}
                      </p>
                      {log.alasan && (
                        <p className="text-[10px] italic text-gray-500 border-l-2 border-gray-200 px-2 mb-3">
                          "{String(log.alasan)}"
                        </p>
                      )}

                      {log.photo && (
                        <button
                          onClick={() => setPreviewImage(log.photo)}
                          className="text-[10px] text-blue-600 font-semibold mb-3 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 transition-colors w-max px-2 py-1 rounded"
                        >
                          <ImageIcon size={12} /> Lihat Bukti Foto/Surat
                        </button>
                      )}

                      <div className="flex gap-2 border-t border-gray-100 pt-3 mt-1">
                        <button
                          onClick={() => handleApproveLog('attendance_logs', log.id, log.approvalStatus)}
                          className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1"
                        >
                          <CheckCircle size={14} /> Setujui
                        </button>
                        <button
                          onClick={() => handleRejectLog('attendance_logs', log.id)}
                          className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1"
                        >
                          <XCircle size={14} /> Tolak
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daftar Siswa */}
            {pendingStudentLogs.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-700 mb-3 text-sm flex items-center gap-2">
                  <GraduationCap size={16} /> Pengajuan Siswa (Orang Tua)
                </h3>
                <div className="space-y-3">
                  {pendingStudentLogs.map(log => (
                    <div
                      key={log.id}
                      className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{String(log.name)}</p>
                          <p className="text-[10px] text-gray-500">
                            Kelas {String(log.kelas)} • {String(log.type)}
                          </p>
                        </div>
                        <span className="text-[9px] font-bold bg-orange-100 text-orange-600 px-2 py-1 rounded text-right w-24 leading-tight">
                          {String(log.approvalStatus)}
                        </span>
                      </div>
                      <p className="text-[10px] bg-gray-50 p-1.5 rounded text-gray-600 font-semibold mb-2 inline-block">
                        Tgl: {String(log.startDate)} s/d {String(log.endDate)}
                      </p>
                      {log.alasan && (
                        <p className="text-[10px] italic text-gray-500 border-l-2 border-gray-200 px-2 mb-3">
                          "{String(log.alasan)}"
                        </p>
                      )}

                      {log.photoUrl && (
                        <button
                          onClick={() => setPreviewImage(log.photoUrl)}
                          className="text-[10px] text-indigo-600 font-semibold mb-3 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 transition-colors w-max px-2 py-1 rounded"
                        >
                          <ImageIcon size={12} /> Lihat Bukti Foto Surat
                        </button>
                      )}

                      <div className="flex gap-2 border-t border-gray-100 pt-3 mt-1">
                        <button
                          onClick={() => handleApproveLog('student_attendance_logs', log.id, log.approvalStatus)}
                          className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1"
                        >
                          <CheckCircle size={14} /> Setujui
                        </button>
                        <button
                          onClick={() => handleRejectLog('student_attendance_logs', log.id)}
                          className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1"
                        >
                          <XCircle size={14} /> Tolak
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderAdminHome = () => {
    const pendingStudentLogsCount = studentLogs.filter(
      l => l.approvalStatus === 'Menunggu Persetujuan Guru' || l.approvalStatus === 'Menunggu Persetujuan Kepsek'
    ).length
    const totalPending = pendingStudentLogsCount

    return (
      <div className="flex flex-col p-6 w-full pb-24 animate-fade-in">
        <div className="w-full flex justify-between items-center mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Panel Admin</h1>
            <h2 className="text-blue-600 text-xs font-semibold">SMP NEGERI 1 LEMBO</h2>
          </div>
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
            <LayoutDashboard size={24} />
          </div>
        </div>

        <div className="w-full mb-6">
          <h2 className="text-gray-500 text-sm">Selamat Datang,</h2>
          <h1 className="text-xl font-bold text-gray-800">{String(userName || 'Administrator')}</h1>
        </div>

        {totalPending > 0 && (
          <button
            onClick={() => setActiveTab('approvals')}
            className="w-full bg-orange-50 border border-orange-200 p-4 rounded-2xl mb-6 flex items-center justify-between shadow-sm animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                <CheckSquare size={20} />
              </div>
              <div className="text-left">
                <h3 className="text-orange-800 font-bold text-sm">Menunggu Persetujuan</h3>
                <p className="text-orange-600 text-xs">Ada {totalPending} pengajuan perlu diverifikasi.</p>
              </div>
            </div>
          </button>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <div className="flex justify-between items-start mb-2">
              <Users className="text-blue-600" size={24} />
              <span className="text-xs font-bold bg-blue-100 text-blue-700 py-1 px-2 rounded-full">Total</span>
            </div>
            <h3 className="text-2xl font-bold text-blue-900">{Number(employees.length)}</h3>
            <p className="text-xs text-blue-600">Total Pegawai</p>
          </div>

          <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
            <div className="flex justify-between items-start mb-2">
              <CheckCircle className="text-green-600" size={24} />
              <span className="text-xs font-bold bg-green-100 text-green-700 py-1 px-2 rounded-full">Bulan Ini</span>
            </div>
            <h3 className="text-2xl font-bold text-green-900">{Number(summary.hadir)}</h3>
            <p className="text-xs text-green-600">Hadir</p>
          </div>

          <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
            <div className="flex justify-between items-start mb-2">
              <Clock className="text-orange-600" size={24} />
            </div>
            <h3 className="text-2xl font-bold text-orange-900">{Number(summary.lambat)}</h3>
            <p className="text-xs text-orange-600">Terlambat</p>
          </div>

          <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
            <div className="flex justify-between items-start mb-2">
              <AlertCircle className="text-red-600" size={24} />
            </div>
            <h3 className="text-2xl font-bold text-red-900">{Number(summary.izin + summary.sakit)}</h3>
            <p className="text-xs text-red-600">Izin / Sakit</p>
          </div>
        </div>

        <h3 className="text-md font-bold text-gray-800 mb-4">Aktivitas Absensi Terbaru</h3>
        <div className="space-y-3">
          {logs.slice(0, 5).map(log => (
            <div
              key={log.id}
              className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold
                  ${
                    log.type === 'Masuk'
                      ? 'bg-blue-100 text-blue-600'
                      : log.type === 'Keluar'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-orange-100 text-orange-600'
                  }`}
                >
                  {log.name ? String(log.name.charAt(0).toUpperCase()) : '?'}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{String(log.name)}</p>
                  <p
                    className={`text-xs font-medium
                    ${
                      log.type === 'Masuk'
                        ? 'text-blue-600'
                        : log.type === 'Keluar'
                        ? 'text-red-600'
                        : 'text-orange-600'
                    }
                  `}
                  >
                    {String(log.type)}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-gray-600">
                {String(formatDate(new Date(log.timestamp)).substring(0, 10))}
              </span>
            </div>
          ))}
          {logs.length === 0 ? <p className="text-sm text-gray-400 text-center">Belum ada aktivitas terekam.</p> : null}
        </div>
      </div>
    )
  }

  const renderAdminPegawai = () => (
    <div className="flex flex-col p-6 w-full pb-24 animate-fade-in relative min-h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Data Pegawai</h2>
          <p className="text-xs text-gray-500">Kelola master data pegawai</p>
        </div>
        <div className="flex gap-2">
          {userRole === 'superadmin' && (
            <button
              onClick={() => setShowConfirmDeactivateAll(true)}
              className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-red-200"
              title="Nonaktifkan Semua"
            >
              <Lock size={20} />
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-indigo-200"
          >
            <UserPlus size={20} />
          </button>
        </div>
      </div>

      {pendingPasswordResets.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-red-600 mb-3 flex items-center gap-2">
            <AlertCircle size={16} /> Permintaan Reset Password
          </h3>
          <div className="space-y-2">
            {pendingPasswordResets.map(emp => (
              <div
                key={emp.id}
                className="bg-red-50 p-3 rounded-xl border border-red-100 flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-sm text-red-900">{String(emp.name)}</p>
                  <p className="text-xs text-red-600 font-medium">NIP: {String(emp.nip)}</p>
                  {emp.requestedPassword && (
                    <p className="text-[10px] text-red-700 bg-red-100 px-2 py-0.5 rounded mt-1 inline-block border border-red-200">
                      Req Pass: <b>{String(emp.requestedPassword)}</b>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleApproveResetPassword(emp.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-md shadow-red-200 transition-colors"
                >
                  Setujui & Ubah
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {employees.map(emp => (
          <div
            key={emp.id}
            className={`bg-white p-4 rounded-xl shadow-sm border ${
              emp.isActive === false ? 'border-red-200 opacity-60' : 'border-gray-100'
            } flex items-center justify-between`}
          >
            <div className="flex items-center gap-3">
              <label className="relative w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase overflow-hidden border border-blue-200 cursor-pointer group shadow-sm flex-shrink-0">
                {emp.photoUrl ? (
                  <img src={emp.photoUrl} alt={emp.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg">{emp.name ? String(emp.name.charAt(0)) : '?'}</span>
                )}
                <div
                  className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Ubah Foto Profil"
                >
                  <Camera size={16} className="text-white" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleEmployeePhotoUpload(e, emp.id)}
                />
              </label>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{String(emp.name)}</p>
                <p className="text-xs text-gray-500 mt-0.5">NIP: {String(emp.nip)}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                    {String(emp.dept)}
                  </span>
                  {emp.isActive === false && (
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-600 rounded-md">
                      Nonaktif
                    </span>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-gray-600 bg-yellow-50 px-2 py-0.5 rounded-md border border-yellow-100">
                    <Key size={10} className="text-yellow-600" />
                    <span className="font-mono">
                      {String(visibleAdminPasswords[emp.id] ? emp.password || '123456' : '••••••')}
                    </span>
                    <button
                      onClick={() => toggleAdminPasswordVisibility(emp.id)}
                      className="ml-1 text-gray-400 hover:text-yellow-600 transition-colors"
                      title={visibleAdminPasswords[emp.id] ? 'Sembunyikan' : 'Lihat Password'}
                    >
                      {visibleAdminPasswords[emp.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {userRole === 'superadmin' && (
                <button
                  onClick={() => handleToggleEmployeeStatus(emp.id, emp.isActive !== false)}
                  className={`p-2 rounded-lg transition-colors ${
                    emp.isActive !== false
                      ? 'text-orange-400 hover:text-orange-600 hover:bg-orange-50'
                      : 'text-green-500 hover:text-green-700 hover:bg-green-50'
                  }`}
                  title={emp.isActive !== false ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                >
                  {emp.isActive !== false ? <Lock size={18} /> : <CheckCircle size={18} />}
                </button>
              )}
              <button
                onClick={() => handleDeleteEmployee(emp.id)}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Hapus Permanen"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {employees.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Belum ada data pegawai.</p>
        ) : null}
      </div>
    </div>
  )

  const renderAdminSiswa = () => (
    <div className="flex flex-col p-6 w-full pb-24 animate-fade-in relative min-h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Data Siswa</h2>
          <p className="text-xs text-gray-500">Kelola data & cetak QR Code Siswa</p>
        </div>
        <button
          onClick={() => setShowAddStudentModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-indigo-200"
        >
          <UserPlus size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {students.map(student => (
          <div
            key={student.id}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <label className="relative w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 overflow-hidden border border-indigo-100 cursor-pointer group shadow-sm flex-shrink-0">
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                ) : (
                  <GraduationCap size={24} />
                )}
                <div
                  className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Ubah Foto Siswa"
                >
                  <Camera size={16} className="text-white" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleStudentPhotoUpload(e, student.id)}
                />
              </label>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{String(student.name)}</p>
                <p className="text-xs text-gray-500 mt-0.5">NISN: {String(student.nisn)}</p>
                <div className="flex gap-2 mt-1">
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                    Kelas {String(student.kelas)}
                  </span>
                  {student.parentPhone && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded-md">
                      <svg
                        viewBox="0 0 24 24"
                        width="10"
                        height="10"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                      </svg>
                      {String(student.parentPhone)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setEditingStudent(student)
                  setShowEditStudentModal(true)
                }}
                className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors flex items-center justify-center gap-1 text-[10px] font-bold"
                title="Edit Data"
              >
                <Edit size={14} /> Edit
              </button>
              <button
                onClick={() => setQrModalStudent(student)}
                className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1 text-[10px] font-bold"
              >
                <QrCode size={14} /> Lihat QR
              </button>
              <button
                onClick={() => handleDeleteStudent(student.id)}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                title="Hapus Data"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {students.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Belum ada data siswa. Silakan tambah data.</p>
        ) : null}
      </div>
    </div>
  )

  const renderAdminLaporan = () => (
    <div className="flex flex-col p-6 w-full pb-24 animate-fade-in">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Laporan Kehadiran Pegawai</h2>

      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Filter Bulan</label>
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
          >
            {[
              'Januari',
              'Februari',
              'Maret',
              'April',
              'Mei',
              'Juni',
              'Juli',
              'Agustus',
              'September',
              'Oktober',
              'November',
              'Desember',
            ].map((m, i) => (
              <option key={i} value={i + 1}>
                {String(m)}
              </option>
            ))}
          </select>
        </div>
        <div className="w-1/3">
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Filter Tahun</label>
          <select
            value={filterYear}
            onChange={e => setFilterYear(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>
                {String(y)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <button
          onClick={handleDownloadPDF}
          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold py-3 px-2 rounded-xl transition-colors border border-red-100"
        >
          <FileText size={18} />
          <span className="text-xs sm:text-sm">Unduh PDF</span>
        </button>
        <button
          onClick={handleDownloadExcel}
          className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-600 hover:bg-green-100 font-bold py-3 px-2 rounded-xl transition-colors border border-green-100"
        >
          <FileSpreadsheet size={18} />
          <span className="text-xs sm:text-sm">Unduh Excel</span>
        </button>
        <button
          onClick={handleDownloadSPTJM}
          className="col-span-2 w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold py-3 px-2 rounded-xl transition-colors border border-blue-100"
        >
          <FileCheck size={18} />
          <span className="text-xs sm:text-sm">Cetak SPTJM (Surat Pernyataan)</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50">
          <span className="text-gray-500 font-medium text-sm">Data Kehadiran</span>
          <span className="text-gray-500 font-medium text-sm">Aksi & Status</span>
        </div>
        {filteredReportData.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">Tidak ada data untuk periode ini.</p>
        ) : (
          filteredReportData.map(pegawai => (
            <div
              key={pegawai.id}
              className={`p-4 border-b border-gray-50 flex justify-between items-center ${
                !pegawai.isActive ? 'bg-red-50 opacity-60' : ''
              }`}
            >
              <div className="flex-1 pr-2">
                <p
                  className={`font-semibold text-sm ${
                    !pegawai.isActive ? 'line-through text-red-800' : 'text-gray-800'
                  }`}
                >
                  {String(pegawai.name)}
                </p>
                <p className={`text-xs ${!pegawai.isActive ? 'text-red-500' : 'text-gray-400'}`}>
                  {String(pegawai.date)} &bull; Masuk: {String(pegawai.time)} &bull; Pulang:{' '}
                  {String(pegawai.timeKeluar)} ({String(pegawai.statusKeluar)})
                  {pegawai.alasan ? ` • Alasan: ${pegawai.alasan}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded-full 
                ${
                  pegawai.status === 'Hadir'
                    ? 'bg-green-100 text-green-700'
                    : pegawai.status === 'Terlambat'
                    ? 'bg-orange-100 text-orange-700'
                    : pegawai.status === 'Sakit'
                    ? 'bg-red-100 text-red-700'
                    : pegawai.status === 'Izin'
                    ? 'bg-yellow-100 text-yellow-700'
                    : pegawai.status === 'Tugas Luar'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
                >
                  {String(pegawai.status)}
                </span>

                <div className="flex items-center border-l border-gray-200 pl-2 ml-1 gap-1">
                  <button
                    onClick={() => handleToggleLogStatusGroup(pegawai.logIds, pegawai.isActive)}
                    className={`p-1.5 rounded-md transition-colors ${
                      pegawai.isActive
                        ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                    }`}
                    title={pegawai.isActive ? 'Nonaktifkan Data' : 'Aktifkan Kembali Data'}
                  >
                    {pegawai.isActive ? <X size={14} strokeWidth={3} /> : <CheckCircle size={14} strokeWidth={3} />}
                  </button>
                  <button
                    onClick={() => handleDeleteLogGroup(pegawai.logIds)}
                    className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-md transition-colors"
                    title="Hapus Permanen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  const renderProfile = () => {
    const currentUserData = employees.find(e => String(e.nip) === String(userNip))
    return (
      <div className="flex flex-col items-center p-6 w-full animate-fade-in">
        <h2 className="text-xl font-bold text-gray-800 mb-8 self-start">Profil Saya</h2>

        <div
          className={`relative w-24 h-24 rounded-full flex items-center justify-center mb-4 shadow-md overflow-hidden border-4 border-white ${
            ['admin', 'superadmin'].includes(userRole) ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'
          }`}
        >
          {userRole === 'pegawai' && currentUserData?.photoUrl ? (
            <img src={currentUserData.photoUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User size={48} />
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-800 uppercase text-center">{String(userName || 'Pegawai')}</h1>
        <p className="text-gray-500 mb-8 text-center font-medium">SMP NEGERI 1 LEMBO</p>

        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-50 flex justify-between">
            <span className="text-gray-500">
              {['admin', 'superadmin'].includes(userRole) ? 'Hak Akses' : 'NIP / NIK'}
            </span>
            <span className="font-semibold text-gray-800">
              {String(
                userRole === 'superadmin'
                  ? 'Super Admin'
                  : userRole === 'admin'
                  ? 'Admin Sistem'
                  : userNip || 'Belum diatur'
              )}
            </span>
          </div>
          <div className="p-4 border-b border-gray-50 flex justify-between">
            <span className="text-gray-500">Departemen</span>
            <span className="font-semibold text-gray-800">
              {['admin', 'superadmin'].includes(userRole) ? 'Manajemen / Admin' : 'Umum'}
            </span>
          </div>
          <div className="p-4 flex justify-between">
            <span className="text-gray-500">Status</span>
            <span className="font-semibold text-green-600">Aktif</span>
          </div>
        </div>

        <div className="w-full space-y-3">
          {['admin', 'superadmin'].includes(userRole) && (
            <button
              onClick={() => setShowLogoModal(true)}
              className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold py-3 px-4 rounded-xl transition-colors border border-blue-100"
            >
              <ImageIcon size={20} />
              Pengaturan Logo & Sistem
            </button>
          )}

          <button
            onClick={() => setShowChangePasswordModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 font-bold py-3 px-4 rounded-xl transition-colors border border-yellow-100"
          >
            <Key size={20} />
            Ubah Password
          </button>

          {isInstallable && (
            <button
              onClick={handleInstallApp}
              className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold py-3 px-4 rounded-xl transition-colors border border-indigo-100"
            >
              <Download size={20} />
              Instal Aplikasi ke Layar HP
            </button>
          )}

          <button
            onClick={() => setShowInfoModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-gray-50 text-gray-600 hover:bg-gray-100 font-bold py-3 px-4 rounded-xl transition-colors border border-gray-200"
          >
            <Info size={20} />
            Tentang Aplikasi
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold py-3 px-4 rounded-xl transition-colors border border-red-100"
          >
            <LogOut size={20} />
            Keluar Akun
          </button>
        </div>
      </div>
    )
  }

  const todayDateObj = new Date()
  const todayString = `${todayDateObj.getFullYear()}-${String(todayDateObj.getMonth() + 1).padStart(2, '0')}-${String(
    todayDateObj.getDate()
  ).padStart(2, '0')}`

  return (
    <div className="min-h-screen w-full bg-gray-50 flex justify-center font-sans overflow-x-hidden">
      <div className="w-full min-h-screen relative flex flex-col">
        {notification && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 w-[90%] max-w-md z-[100] animate-slide-down">
            <div
              className={`p-4 rounded-xl shadow-lg flex items-center gap-3 text-white ${
                notification.type === 'success' ? 'bg-green-600' : 'bg-red-500'
              }`}
            >
              {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <span className="font-medium">{String(notification.message)}</span>
            </div>
          </div>
        )}

        {previewImage && (
          <div
            className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 animate-fade-in"
            onClick={() => setPreviewImage(null)}
          >
            <div className="w-full max-w-3xl flex justify-end mb-4">
              <button
                onClick={() => setPreviewImage(null)}
                className="text-white bg-white/20 hover:bg-white/40 p-2 rounded-full transition-colors backdrop-blur-sm"
              >
                <X size={24} />
              </button>
            </div>
            <img
              src={previewImage}
              alt="Preview Bukti"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}

        {/* Modal Logo KOP & Lokasi (Admin) */}
        {showLogoModal && (
          <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-6 animate-fade-in backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Pengaturan Sistem</h3>
                <button
                  onClick={() => setShowLogoModal(false)}
                  className="text-gray-400 hover:text-gray-600 bg-gray-50 p-1 rounded-md"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-gray-50">
                  <span className="text-xs font-bold text-gray-700 mb-2">Logo Kab. Morowali Utara (Kiri)</span>
                  {logos.kab ? (
                    <img src={logos.kab} alt="Logo Kab" className="h-16 object-contain mb-3" />
                  ) : (
                    <div className="h-16 w-16 bg-white border border-gray-200 rounded-full mb-3 flex items-center justify-center text-gray-400 shadow-sm">
                      <ImageIcon size={24} />
                    </div>
                  )}
                  <label className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-700 transition shadow-md shadow-blue-200">
                    {logos.kab ? 'Ganti Logo' : 'Pilih Gambar'}
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleLogoUpload(e, 'kab')} />
                  </label>
                </div>

                <div className="border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-gray-50">
                  <span className="text-xs font-bold text-gray-700 mb-2">Logo Sekolah (Kanan & App Icon)</span>
                  {logos.sek ? (
                    <img src={logos.sek} alt="Logo Sekolah" className="h-16 object-contain mb-3" />
                  ) : (
                    <div className="h-16 w-16 bg-white border border-gray-200 rounded-full mb-3 flex items-center justify-center text-gray-400 shadow-sm">
                      <ImageIcon size={24} />
                    </div>
                  )}
                  <label className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-700 transition shadow-md shadow-indigo-200">
                    {logos.sek ? 'Ganti Logo' : 'Pilih Gambar'}
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleLogoUpload(e, 'sek')} />
                  </label>
                </div>

                <div className="border border-green-200 rounded-xl p-4 bg-green-50 text-center">
                  <span className="text-xs font-bold text-green-800 mb-2 block">Titik Koordinat Sekolah (GPS)</span>
                  <p className="text-[10px] text-green-700 mb-3 leading-tight">
                    Setel lokasi ini <b>satu kali saja</b> saat Anda berada tepat di Sekolah. Sistem akan menyimpannya
                    secara permanen.
                  </p>
                  {logos.schoolLocation && logos.schoolLocation.lat ? (
                    <div className="mb-3">
                      <p className="text-xs font-bold text-green-600 bg-green-100 py-1.5 px-2 rounded-md inline-block w-full">
                        ✅ Tersimpan Permanen
                      </p>
                      <p className="text-[9px] text-green-800 font-mono mt-1">
                        Lat: {logos.schoolLocation.lat.toFixed(6)}, Lng: {logos.schoolLocation.lng.toFixed(6)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-orange-600 mb-3 bg-orange-100 py-1 px-2 rounded-md w-full">
                      ⚠️ Titik GPS Belum Disetel
                    </p>
                  )}
                  <button
                    onClick={handleSetSchoolLocation}
                    disabled={isLoading}
                    className={`${
                      logos.schoolLocation?.lat
                        ? 'bg-white text-green-700 border border-green-300 hover:bg-green-50'
                        : 'bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200'
                    } px-4 py-3 rounded-lg text-[11px] font-bold cursor-pointer transition w-full`}
                  >
                    {isLoading
                      ? 'Mencari Titik GPS Anda...'
                      : logos.schoolLocation?.lat
                      ? '📍 Perbarui Titik GPS (Hanya Jika Perlu)'
                      : '📍 Jadikan Lokasi Ini Sebagai Titik Sekolah'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Lupa Password (Login Screen) */}
        {showForgotModal && (
          <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-6 animate-fade-in backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Lupa Password?</h3>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="text-gray-400 hover:text-gray-600 bg-gray-50 p-1 rounded-md"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                Masukkan NIP / NIK dan Password Baru yang Anda inginkan. Admin akan meninjau dan menyetujui perubahan
                tersebut.
              </p>
              <form onSubmit={submitForgotPassword} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={forgotNip}
                    onChange={e => setForgotNip(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                    placeholder="Masukkan NIP / NIK"
                    required
                  />
                </div>
                <div className="relative">
                  <input
                    type={showPasswordForgot ? 'text' : 'password'}
                    value={forgotNewPassword}
                    onChange={e => setForgotNewPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-3 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                    placeholder="Password Baru (Min. 6 Karakter)"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordForgot(!showPasswordForgot)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPasswordForgot ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mt-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                  Kirim Permintaan Ubah
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal Ubah Password (Profile Screen) */}
        {showChangePasswordModal && (
          <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-6 animate-fade-in backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Ubah Password Baru</h3>
                <button
                  onClick={() => setShowChangePasswordModal(false)}
                  className="text-gray-400 hover:text-gray-600 bg-gray-50 p-1 rounded-md"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                Pastikan password baru Anda mudah diingat dan minimal terdiri dari 6 karakter.
              </p>
              <form onSubmit={submitChangePassword} className="space-y-4">
                <div className="relative">
                  <input
                    type={showPasswordChange ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-3 pr-10 text-sm focus:ring-2 focus:ring-yellow-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                    placeholder="Masukkan Password Baru"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPasswordChange ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button
                  type="submit"
                  className="w-full bg-yellow-500 text-white font-bold py-3 rounded-xl mt-2 hover:bg-yellow-600 transition-colors shadow-lg shadow-yellow-200"
                >
                  Simpan Password
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi Nonaktifkan Semua */}
        {showConfirmDeactivateAll && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-6 animate-fade-in backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center relative">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto mb-4 border border-red-200">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Nonaktifkan Semua Akun?</h3>
              <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                Tindakan ini akan membuat semua pegawai tidak dapat login ke dalam aplikasi sampai Anda mengaktifkannya
                kembali.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDeactivateAll(false)}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeactivateAllEmployees}
                  disabled={isLoading}
                  className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                >
                  {isLoading ? 'Memproses...' : 'Ya, Nonaktifkan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Dokumen Pengajuan Khusus Pegawai*/}
        {showSpecialModal && (
          <div className="fixed inset-0 bg-black/50 z-[55] flex items-center justify-center p-6 animate-fade-in backdrop-blur-sm overflow-y-auto">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl my-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Pengajuan {String(specialAbsenData.type)}</h3>
                <button
                  onClick={() => setShowSpecialModal(false)}
                  className="text-gray-400 hover:text-gray-600 bg-gray-50 p-1 rounded-md"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                Silakan unggah{' '}
                <strong className="text-gray-700">
                  {specialAbsenData.type === 'Tugas Luar'
                    ? 'Surat Tugas'
                    : specialAbsenData.type === 'Izin'
                    ? 'Surat Keterangan Izin'
                    : 'Surat Sakit dari Dokter'}
                </strong>{' '}
                beserta alasan pengajuan.
              </p>

              <form onSubmit={submitSpecialAbsen} className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Dari Tanggal</label>
                    <input
                      type="date"
                      value={specialAbsenData.startDate}
                      min={todayString}
                      onChange={e => setSpecialAbsenData({ ...specialAbsenData, startDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={specialAbsenData.endDate}
                      min={specialAbsenData.startDate || todayString}
                      onChange={e => setSpecialAbsenData({ ...specialAbsenData, endDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 transition relative">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload size={32} className="text-blue-500 mb-2" />
                  <span className="text-xs font-medium text-blue-800 text-center px-4 line-clamp-2">
                    {specialAbsenData.fileName ? String(specialAbsenData.fileName) : 'Ketuk untuk foto/pilih dokumen'}
                  </span>
                </div>

                <textarea
                  value={specialAbsenData.alasan}
                  onChange={e => setSpecialAbsenData({ ...specialAbsenData, alasan: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                  placeholder="Tuliskan alasan/keterangan singkat..."
                  rows="2"
                  required
                />

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mt-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                  Kirim Pengajuan
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal Pengajuan Khusus Orang Tua */}
        {showParentSpecialModal && (
          <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-6 animate-fade-in backdrop-blur-sm overflow-y-auto">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl my-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Formulir {String(parentSpecialData.type)}</h3>
                <button
                  onClick={() => setShowParentSpecialModal(false)}
                  className="text-gray-400 hover:text-gray-600 bg-gray-50 p-1 rounded-md transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                Silakan unggah foto surat keterangan{' '}
                {parentSpecialData.type === 'Izin' ? 'izin' : 'sakit dari dokter/orang tua'} dan isi alasan
                ketidakhadiran anak Anda.
              </p>

              <form onSubmit={submitParentSpecial} className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Dari Tanggal</label>
                    <input
                      type="date"
                      value={parentSpecialData.startDate}
                      min={todayString}
                      onChange={e => setParentSpecialData({ ...parentSpecialData, startDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={parentSpecialData.endDate}
                      min={parentSpecialData.startDate || todayString}
                      onChange={e => setParentSpecialData({ ...parentSpecialData, endDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="border-2 border-dashed border-indigo-300 rounded-xl p-6 flex flex-col items-center justify-center bg-indigo-50 hover:bg-indigo-100 transition relative">
                  <input
                    type="file"
                    onChange={handleParentFileChange}
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required={!parentSpecialData.photoBase64}
                  />
                  <Camera size={32} className="text-indigo-500 mb-2" />
                  <span className="text-xs font-medium text-indigo-800 text-center px-4 line-clamp-2">
                    {parentSpecialData.fileName ? String(parentSpecialData.fileName) : 'Ketuk untuk foto/pilih surat'}
                  </span>
                </div>

                <textarea
                  value={parentSpecialData.alasan}
                  onChange={e => setParentSpecialData({ ...parentSpecialData, alasan: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                  placeholder="Tuliskan alasan/keterangan ketidakhadiran..."
                  rows="3"
                  required
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl mt-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                  {isLoading ? 'Mengirim...' : 'Kirim Pengajuan'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal Tambah Pegawai (Admin) */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-6 animate-fade-in backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Tambah Pegawai Baru</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 bg-gray-50 p-1 rounded-md"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={newEmployee.name}
                    onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                    placeholder="Contoh: Budi Santoso"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">NIP / NIK</label>
                  <input
                    type="text"
                    value={newEmployee.nip}
                    onChange={e => setNewEmployee({ ...newEmployee, nip: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                    placeholder="Masukkan NIP"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Departemen / Jabatan</label>
                  <select
                    value={newEmployee.dept}
                    onChange={e => setNewEmployee({ ...newEmployee, dept: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                  >
                    <option value="Guru">Guru</option>
                    <option value="Tata Usaha">Tata Usaha</option>
                    <option value="Kepala Sekolah">Kepala Sekolah</option>
                    <option value="Tenaga Honorer">Tenaga Honorer</option>
                    <option value="Tenaga Administrasi">Tenaga Administrasi</option>
                    <option value="Penjaga Sekolah">Penjaga Sekolah</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl mt-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                  Simpan Data
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal Tambah Siswa (Admin) */}
        {showAddStudentModal && (
          <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-6 animate-fade-in backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Tambah Data Siswa</h3>
                <button
                  onClick={() => setShowAddStudentModal(false)}
                  className="text-gray-400 hover:text-gray-600 bg-gray-50 p-1 rounded-md"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    value={newStudent.name}
                    onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                    placeholder="Contoh: Andi Pratama"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">NISN / NIS</label>
                    <input
                      type="text"
                      value={newStudent.nisn}
                      onChange={e => setNewStudent({ ...newStudent, nisn: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                      placeholder="Contoh: 009123456"
                    />
                  </div>
                  <div className="w-[35%]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Kelas</label>
                    <select
                      value={newStudent.kelas}
                      onChange={e => setNewStudent({ ...newStudent, kelas: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                    >
                      <option value="VII">VII</option>
                      <option value="VIII">VIII</option>
                      <option value="IX">IX</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">No. WA Orang Tua (Opsional)</label>
                  <input
                    type="text"
                    value={newStudent.parentPhone}
                    onChange={e => setNewStudent({ ...newStudent, parentPhone: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                    placeholder="Contoh: 081234567890"
                  />
                  <p className="text-[9px] text-gray-500 mt-1">
                    Jika diisi, notifikasi scan bisa diteruskan ke nomor ini.
                  </p>
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl mt-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                  Simpan Data Siswa
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal Edit Siswa (Admin) */}
        {showEditStudentModal && editingStudent && (
          <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-6 animate-fade-in backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Edit Data Siswa</h3>
                <button
                  onClick={() => {
                    setShowEditStudentModal(false)
                    setEditingStudent(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 bg-gray-50 p-1 rounded-md"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    value={editingStudent.name}
                    onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">NISN / NIS</label>
                    <input
                      type="text"
                      value={editingStudent.nisn}
                      onChange={e => setEditingStudent({ ...editingStudent, nisn: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                      required
                    />
                  </div>
                  <div className="w-[35%]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Kelas</label>
                    <select
                      value={editingStudent.kelas}
                      onChange={e => setEditingStudent({ ...editingStudent, kelas: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                    >
                      <option value="VII">VII</option>
                      <option value="VIII">VIII</option>
                      <option value="IX">IX</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">No. WA Orang Tua (Opsional)</label>
                  <input
                    type="text"
                    value={editingStudent.parentPhone || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                    placeholder="Contoh: 081234567890"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-amber-500 text-white font-bold py-3 rounded-xl mt-2 hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200"
                >
                  {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal Tampilan QR Code Siswa */}
        {qrModalStudent && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 sm:p-6 animate-fade-in backdrop-blur-sm overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl flex flex-col items-center relative my-auto">
              <button
                onClick={() => setQrModalStudent(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors z-20"
              >
                <X size={20} />
              </button>

              <h2 className="font-bold text-gray-800 text-xl mb-6 text-center w-full">Pratinjau Kartu Absensi</h2>

              <div className="flex flex-col md:flex-row gap-6 w-full justify-center items-center mb-8">
                {/* Kartu Bagian Depan (Preview Skala Rasio CR80) */}
                <div className="w-[204px] h-[324px] border border-gray-300 rounded-[10px] flex flex-col relative bg-white shadow-md overflow-hidden shrink-0">
                  <div className="text-[7px] absolute top-1.5 right-2 text-gray-400 font-bold tracking-wider z-30">
                    DEPAN
                  </div>

                  {/* Header */}
                  <div className="absolute top-0 left-0 w-full h-[45px] bg-white border-b-[1.5px] border-sky-500 flex items-center px-3 z-20 box-border">
                    <img
                      src={logos.sek || logos.kab || 'https://cdn-icons-png.flaticon.com/512/3135/3135810.png'}
                      alt="Logo"
                      className="w-[26px] h-[26px] object-contain mr-2 shrink-0"
                    />
                    <div className="text-left flex flex-col justify-center">
                      <h2 className="font-black text-red-700 text-[10px] tracking-tight leading-tight mb-[1px]">
                        KARTU ABSENSI SISWA
                      </h2>
                      <p className="text-[7px] font-extrabold text-slate-800 leading-tight">SMP NEGERI 1 LEMBO</p>
                    </div>
                  </div>

                  {/* Foto Wajah */}
                  {qrModalStudent.photoUrl ? (
                    <img
                      src={qrModalStudent.photoUrl}
                      alt="Foto"
                      className="absolute top-[45px] left-0 w-full h-[calc(100%-45px-76px)] object-cover bg-slate-100 z-10"
                    />
                  ) : (
                    <div className="absolute top-[45px] left-0 w-full h-[calc(100%-45px-76px)] bg-slate-100 flex flex-col items-center justify-center text-slate-400 text-[10px] font-bold z-10">
                      <User size={32} className="mb-2 opacity-30" />
                      FOTO SISWA
                    </div>
                  )}

                  {/* Overlay Footer Bawah */}
                  <div className="absolute bottom-0 left-0 h-[76px] bg-[#164e63] w-full flex items-center justify-between px-3 overflow-hidden z-20 box-border">
                    <div className="absolute -left-4 -bottom-4 w-16 h-16 rounded-full bg-purple-700 opacity-90 z-0"></div>
                    <div className="absolute -left-2 top-3 w-3 h-3 bg-sky-500 opacity-50 z-0 rounded-sm"></div>

                    <div className="flex flex-col z-10 w-[65%] text-left">
                      <span className="text-white font-black text-[11px] leading-tight uppercase truncate mb-[2px] shadow-sm">
                        {String(qrModalStudent.name)}
                      </span>
                      <span className="text-slate-200 font-medium text-[8px] leading-tight shadow-sm">
                        NISN : {String(qrModalStudent.nisn)}
                      </span>
                      <span className="text-slate-200 font-medium text-[8px] leading-tight shadow-sm">
                        KELAS {String(qrModalStudent.kelas)}
                      </span>
                    </div>

                    <div className="z-10 shrink-0">
                      <img
                        src={`https://quickchart.io/qr?text=${encodeURIComponent(
                          qrModalStudent.nisn
                        )}&size=150&margin=0&dark=ffffff&light=164e63`}
                        alt="QR Code"
                        className="w-[50px] h-[50px] rounded-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Kartu Bagian Belakang (Preview Skala Rasio CR80) */}
                <div className="w-[204px] h-[324px] border border-gray-300 rounded-[10px] p-4 flex flex-col items-center justify-center relative bg-gray-50 shadow-md shrink-0">
                  <div className="text-[7px] absolute top-1.5 right-2 text-gray-400 font-bold tracking-wider">
                    BELAKANG
                  </div>

                  <div className="font-black text-gray-800 text-[11px] mb-3">SCAN QR CODE</div>

                  <div className="bg-white border-2 border-gray-200 p-1.5 rounded-xl shadow-sm mb-4">
                    <img
                      src={`https://quickchart.io/qr?text=${encodeURIComponent(qrModalStudent.nisn)}&size=120&margin=1`}
                      alt="QR Code"
                      className="w-[100px] h-[100px]"
                    />
                  </div>

                  <p className="text-[8px] font-semibold text-gray-500 text-center px-1.5 leading-relaxed">
                    Gunakan QR Code ini pada perangkat pemindai absensi yang tersedia di sekolah.
                  </p>
                </div>
              </div>

              <button
                onClick={() => handlePrintQR(qrModalStudent)}
                className="w-full max-w-sm bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-200 flex justify-center items-center gap-2 text-sm"
              >
                <Download size={20} /> Cetak Kartu PDF
              </button>
            </div>
          </div>
        )}

        {/* Modal Info Aplikasi */}
        {showInfoModal && (
          <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-6 animate-fade-in backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center relative">
              <button
                onClick={() => setShowInfoModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-50 p-1.5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mx-auto mb-4 border border-indigo-100">
                <Info size={32} />
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-1">Aplikasi Absensi</h3>
              <p className="text-sm font-semibold text-gray-500 mb-6">SMP NEGERI 1 LEMBO</p>

              <div className="bg-gray-50 p-5 rounded-2xl mb-6 border border-gray-100 shadow-inner">
                <p className="text-xs text-gray-500 mb-1">Hak Cipta &copy; {new Date().getFullYear()}</p>
                <p className="text-sm font-bold text-gray-800">Diciptakan Oleh:</p>
                <p className="text-lg font-black text-indigo-600 mt-1 tracking-wide">Gr.YUSMUKMIN, S.I.P</p>
              </div>

              <p className="text-[10px] text-gray-400 font-medium">
                Versi 1.0.0 &bull; Dibuat untuk Kemajuan Pendidikan
              </p>
            </div>
          </div>
        )}

        {/* Modal Kamera Fullscreen */}
        {showCamera && (
          <div className="fixed inset-0 bg-black z-[60] flex flex-col animate-fade-in">
            <div className="flex justify-between items-center p-4 text-white bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
              <span className="font-semibold text-sm">
                Foto Kehadiran{' '}
                {pendingAbsen?.type === 'Izin'
                  ? '(Bukti Izin)'
                  : pendingAbsen?.type === 'Hadir Terlambat'
                  ? '(Terlambat)'
                  : isCheckedIn
                  ? '(Keluar)'
                  : '(Masuk)'}
              </span>
              <button
                onClick={() => {
                  setShowCamera(false)
                  setPendingAbsen(null)
                }}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-gray-900">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="min-w-full min-h-full object-cover transform scale-x-[-1]"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="absolute bottom-0 w-full p-8 pb-12 bg-gradient-to-t from-black/90 to-transparent flex flex-col justify-center items-center">
              <button
                onClick={capturePhotoAndAbsen}
                className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/50 mb-2"
              >
                <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center transform transition active:scale-95">
                  <Camera size={32} className="text-gray-800" />
                </div>
              </button>
              <p className="text-white/70 text-xs text-center">Pastikan wajah dan lingkungan terlihat jelas.</p>
            </div>
          </div>
        )}

        {/* --- MAIN ROUTING LOGIC --- */}
        {!isLoggedIn && !isParentMode ? (
          renderLogin()
        ) : isParentMode ? (
          renderParentPortal()
        ) : (
          <>
            <div className="flex-1 w-full max-w-4xl mx-auto overflow-y-auto pb-24 no-scrollbar">
              {userRole === 'pegawai' && activeTab === 'home' && renderHome()}
              {userRole === 'pegawai' && activeTab === 'history' && renderHistory()}
              {userRole === 'pegawai' && activeTab === 'scan' && renderScanQR()}
              {userRole === 'pegawai' && activeTab === 'approvals' && renderApprovals()}

              {['admin', 'superadmin'].includes(userRole) && activeTab === 'admin-home' && renderAdminHome()}
              {['admin', 'superadmin'].includes(userRole) && activeTab === 'admin-pegawai' && renderAdminPegawai()}
              {['admin', 'superadmin'].includes(userRole) && activeTab === 'admin-siswa' && renderAdminSiswa()}
              {['admin', 'superadmin'].includes(userRole) && activeTab === 'admin-laporan' && renderAdminLaporan()}
              {['admin', 'superadmin'].includes(userRole) && activeTab === 'scan' && renderScanQR()}
              {['admin', 'superadmin'].includes(userRole) && activeTab === 'approvals' && renderApprovals()}

              {activeTab === 'profile' && renderProfile()}
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 px-1 sm:px-2 py-2 flex justify-around items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
              {userRole === 'pegawai' ? (
                <>
                  <button
                    onClick={() => setActiveTab('home')}
                    className={`flex flex-col items-center justify-center gap-1 p-1 w-full max-w-[64px] transition-colors ${
                      activeTab === 'home' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Home size={22} className={activeTab === 'home' ? 'fill-blue-50' : ''} />
                    <span className="text-[9px] sm:text-[10px] font-medium">Beranda</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`flex flex-col items-center justify-center gap-1 p-1 w-full max-w-[64px] transition-colors ${
                      activeTab === 'history' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Clock size={22} className={activeTab === 'history' ? 'fill-blue-50' : ''} />
                    <span className="text-[9px] sm:text-[10px] font-medium">Riwayat</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('scan')}
                    className={`flex flex-col items-center justify-center gap-1 p-1 w-full max-w-[64px] transition-colors ${
                      activeTab === 'scan' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Scan size={22} className={activeTab === 'scan' ? 'text-blue-600' : ''} />
                    <span className="text-[9px] sm:text-[10px] font-medium">Scan QR</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex flex-col items-center justify-center gap-1 p-1 w-full max-w-[64px] transition-colors ${
                      activeTab === 'profile' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <User size={22} className={activeTab === 'profile' ? 'fill-blue-50' : ''} />
                    <span className="text-[9px] sm:text-[10px] font-medium">Profil</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setActiveTab('admin-home')}
                    className={`flex flex-col items-center justify-center gap-1 p-1 w-full max-w-[60px] transition-colors ${
                      activeTab === 'admin-home' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <LayoutDashboard size={20} className={activeTab === 'admin-home' ? 'fill-indigo-50' : ''} />
                    <span className="text-[8px] sm:text-[9px] font-medium">Beranda</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('admin-pegawai')}
                    className={`flex flex-col items-center justify-center gap-1 p-1 w-full max-w-[60px] transition-colors ${
                      activeTab === 'admin-pegawai' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Users size={20} className={activeTab === 'admin-pegawai' ? 'fill-indigo-50' : ''} />
                    <span className="text-[8px] sm:text-[9px] font-medium">Pegawai</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('admin-siswa')}
                    className={`flex flex-col items-center justify-center gap-1 p-1 w-full max-w-[60px] transition-colors ${
                      activeTab === 'admin-siswa' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <GraduationCap size={20} className={activeTab === 'admin-siswa' ? 'fill-indigo-50' : ''} />
                    <span className="text-[8px] sm:text-[9px] font-medium">Siswa</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('admin-laporan')}
                    className={`flex flex-col items-center justify-center gap-1 p-1 w-full max-w-[60px] transition-colors ${
                      activeTab === 'admin-laporan' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <ClipboardList size={20} className={activeTab === 'admin-laporan' ? 'fill-indigo-50' : ''} />
                    <span className="text-[8px] sm:text-[9px] font-medium">Laporan</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('scan')}
                    className={`flex flex-col items-center justify-center gap-1 p-1 w-full max-w-[60px] transition-colors ${
                      activeTab === 'scan' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Scan size={20} className={activeTab === 'scan' ? 'text-indigo-600' : ''} />
                    <span className="text-[8px] sm:text-[9px] font-medium">Scan QR</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex flex-col items-center justify-center gap-1 p-1 w-full max-w-[60px] transition-colors ${
                      activeTab === 'profile' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <User size={20} className={activeTab === 'profile' ? 'fill-indigo-50' : ''} />
                    <span className="text-[8px] sm:text-[9px] font-medium">Profil</span>
                  </button>
                </>
              )}
            </div>
          </>
        )}

        <style
          dangerouslySetInnerHTML={{
            __html: `
          .animate-fade-in { animation: fadeIn 0.3s ease-out; }
          .animate-slide-down { animation: slideDown 0.3s ease-out forwards; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          
          /* CSS Khusus Untuk HTML5-QRCode Scanner */
          #qr-reader { border: none !important; border-radius: 16px; overflow: hidden; background: #000; box-shadow: inset 0px 0px 10px rgba(0,0,0,0.5); }
          #qr-reader__scan_region { background: #000; min-height: 250px; }
          #qr-reader__dashboard_section_csr button, #qr-reader__dashboard_section_swaplink { 
            background-color: #4f46e5 !important; color: white !important; border: none !important; 
            padding: 10px 20px !important; border-radius: 10px !important; font-weight: bold !important; 
            margin: 10px 5px !important; cursor: pointer; transition: 0.2s; text-decoration: none !important;
          }
          #qr-reader__dashboard_section_csr button:hover, #qr-reader__dashboard_section_swaplink:hover { background-color: #4338ca !important; }
          #qr-reader a { color: #4f46e5; font-weight: bold; }
        `,
          }}
        />
      </div>
    </div>
  )
}
