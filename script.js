
/* =========================================
   DATA STRUCTURE & MOCK FILE SYSTEM
   ========================================= */

const fileSystem = {
    name: "TaskManagerPro",
    type: "folder",
    isOpen: true,
    analysis: {
        role: "Project Root",
        description: "The root directory of the Android project.",
        purpose: "Container for all modules and project-level configuration.",
        flow: "Build starts here with settings.gradle (not shown) and moves into the 'app' module.",
        functions: ["Project Organization", "Version Control Root"],
        usage: "Maintains the overall project structure.",
        connections: [],
        standards: "Standard Android project structure follows Gradle conventions."
    },
    children: {
        "app": {
            name: "app",
            type: "folder",
            isOpen: true,
            analysis: {
                role: "App Module",
                description: "The main module where your application code lives.",
                purpose: "Contains source code, resource files, and module-level build configurations.",
                flow: "The build system compiles this module into the final APK/AAB.",
                functions: ["Source Code Hosting", "Resource Management"],
                usage: "Where 99% of development happens.",
                connections: [],
                standards: "Separation of concerns: manifests, java (code), res (resources)."
            },
            children: {
                "manifests": {
                    name: "manifests",
                    type: "folder",
                    isOpen: false,
                    analysis: {
                        role: "Manifests Folder",
                        description: "Contains the AndroidManifest.xml file.",
                        purpose: "To hold the essential metadata file for the Android OS.",
                        flow: "Read by the OS upon installation and app launch.",
                        functions: ["Metadata Storage"],
                        usage: "Defining permissions, activities, and services.",
                        connections: [],
                        standards: "Every Android module must have a manifest."
                    },
                    children: {
                        "AndroidManifest.xml": {
                            name: "AndroidManifest.xml",
                            type: "file",
                            language: "xml",
                            content: `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.taskmanagerpro">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:name=".TaskApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.TaskManagerPro">

        <activity
            android:name=".ui.auth.LoginActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <activity android:name=".ui.auth.RegisterActivity" />

        <activity android:name=".ui.main.MainActivity" />
    </application>

</manifest>`,
                            analysis: {
                                role: "App Manifest",
                                description: "The <b>AndroidManifest.xml</b> is the 'passport' of your app. It tells the Android OS essential information before the app can even run.",
                                purpose: "To declare app components and required permissions.",
                                flow: "OS checks this file to know which Activity to launch first (Launcher Intent).",
                                functions: [
                                    "Permission Declaration (Internet)",
                                    "Component Registration (Activities)",
                                    "Hardware/Software Feature Requirements"
                                ],
                                usage: "Used whenever you add a new screen (Activity) or need a new system capability.",
                                connections: [
                                    { label: "Application Class", path: "app/src/main/java/com/example/taskmanagerpro/TaskApplication.kt" },
                                    { label: "LoginActivity", path: "app/src/main/java/com/example/taskmanagerpro/ui/auth/LoginActivity.kt" },
                                    { label: "RegisterActivity", path: "app/src/main/java/com/example/taskmanagerpro/ui/auth/RegisterActivity.kt" }
                                ]
                            }
                        }
                    }
                },
                "src": {
                    name: "src",
                    type: "folder",
                    isOpen: true,
                    analysis: {
                        role: "Source Root",
                        description: "Root folder for all source sets (main, test, androidTest).",
                        purpose: "To separate production code from tests.",
                        flow: "Gradle looks here for 'main' code and 'test' code.",
                        functions: ["Source Set Organization"],
                        usage: "Standard Gradle structure.",
                        connections: [],
                        standards: "Always keep unit tests (test) and instrumentation tests (androidTest) parallel to main."
                    },
                    children: {
                        "main": {
                            name: "main",
                            type: "folder",
                            isOpen: true,
                            analysis: {
                                role: "Main Source Set",
                                description: "Contains the production code and resources.",
                                purpose: "Everything inside here ends up in the final app.",
                                flow: "Compiled into DEX files and merged resources.",
                                functions: ["Production Code Hosting"],
                                usage: "Primary development location.",
                                connections: [],
                                standards: "Follows 'java' (Kotlin) and 'res' (Resources) split."
                            },
                            children: {
                                "java": {
                                    name: "java",
                                    type: "folder",
                                    isOpen: true,
                                    analysis: {
                                        role: "Kotlin/Java Source",
                                        description: "Contains all Kotlin and Java source files.",
                                        purpose: "Business logic, UI logic, and data handling.",
                                        flow: "Compiled to bytecode for the Android Runtime (ART).",
                                        functions: ["Logic Implementation"],
                                        usage: "Where you write the code that makes the app work.",
                                        connections: [],
                                        standards: "Organized by package name (com.example...)."
                                    },
                                    children: {
                                        "com.example.taskmanagerpro": {
                                            name: "com.example.taskmanagerpro",
                                            type: "package",
                                            isOpen: true,
                                            analysis: {
                                                role: "Root Package",
                                                description: "The unique identifier for your app's code classes.",
                                                purpose: "Namespace to prevent class name collisions.",
                                                flow: "Base for all imports.",
                                                functions: ["Namespacing"],
                                                usage: "Should match the package ID in build.gradle.",
                                                connections: [],
                                                standards: "Reverse domain name notation."
                                            },
                                            children: {
                                                "TaskApplication.kt": {
                                                    name: "TaskApplication.kt",
                                                    type: "file",
                                                    language: "kotlin",
                                                    content: `package com.example.taskmanagerpro

import android.app.Application
import dagger.hilt.android.HiltAndroidApp
import timber.log.Timber

@HiltAndroidApp
class TaskApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
        }
    }
}`,
                                                    analysis: {
                                                        role: "Application Class",
                                                        description: "The base class for maintaining global application state. Annotated with <b>@HiltAndroidApp</b> to trigger Dagger Hilt code generation.",
                                                        purpose: "Entry point for the app process, before any Activity starts.",
                                                        flow: "1. App process starts -> 2. Application.onCreate() runs -> 3. Hilt initializes -> 4. LoginActivity launches.",
                                                        functions: [
                                                            "Initialize Dependency Injection (Hilt)",
                                                            "Initialize Logging (Timber)",
                                                            "Global Configuration"
                                                        ],
                                                        usage: "Use this for library initializations that need to happen once at startup.",
                                                        connections: [
                                                            { label: "Manifest", path: "app/manifests/AndroidManifest.xml" },
                                                            { label: "DI Module", path: "app/src/main/java/com/example/taskmanagerpro/di/AppModule.kt" }
                                                        ]
                                                    }
                                                },
                                                "data": {
                                                    name: "data",
                                                    type: "package",
                                                    isOpen: false,
                                                    analysis: {
                                                        role: "Data Layer",
                                                        description: "Contains all data-related logic: Databases, API clients, and Repositories.",
                                                        purpose: "To abstract the source of data from the UI.",
                                                        flow: "UI -> ViewModel -> Repository -> Data Source (DB/Network).",
                                                        functions: ["Data Persistence", "Network Communication", "Data Mapping"],
                                                        usage: "Any file handling raw data goes here.",
                                                        connections: [],
                                                        standards: "Clean Architecture: The 'Data' layer should not know about the 'UI' layer."
                                                    },
                                                    children: {
                                                        "local": {
                                                            name: "local",
                                                            type: "package",
                                                            isOpen: false,
                                                            analysis: {
                                                                role: "Local Data Source",
                                                                description: "Handles device-local storage, typically a Room database.",
                                                                purpose: "Offline data persistence.",
                                                                flow: "Repository requests data -> DAO queries SQLite -> Objects returned.",
                                                                functions: ["Database Definition", "SQL Queries"],
                                                                usage: "Storing tasks so they appear without internet.",
                                                                connections: [],
                                                                standards: "Use Room library for type-safe SQL."
                                                            },
                                                            children: {
                                                                "TaskDatabase.kt": {
                                                                    name: "TaskDatabase.kt",
                                                                    type: "file",
                                                                    language: "kotlin",
                                                                    content: `package com.example.taskmanagerpro.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.example.taskmanagerpro.data.model.Task

@Database(entities = [Task::class], version = 1)
abstract class TaskDatabase : RoomDatabase() {
    abstract fun taskDao(): TaskDao
}`,
                                                                    analysis: {
                                                                        role: "Room Database",
                                                                        description: "Defines the local database configuration using the Room library.",
                                                                        purpose: "To serve as the main access point to the persisted data.",
                                                                        flow: "Provided by Hilt to the Repository.",
                                                                        functions: [
                                                                            "Define Entities (Tables)",
                                                                            "Expose DAOs",
                                                                            "Manage Database Versioning"
                                                                        ],
                                                                        usage: "Created once (Singleton) and injected.",
                                                                        connections: [
                                                                            { label: "Task Entity", path: "app/src/main/java/com/example/taskmanagerpro/data/model/Task.kt" },
                                                                            { label: "Task DAO", path: "app/src/main/java/com/example/taskmanagerpro/data/local/TaskDao.kt" }
                                                                        ]
                                                                    }
                                                                },
                                                                "TaskDao.kt": {
                                                                    name: "TaskDao.kt",
                                                                    type: "file",
                                                                    language: "kotlin",
                                                                    content: `package com.example.taskmanagerpro.data.local

import androidx.room.*
import com.example.taskmanagerpro.data.model.Task
import kotlinx.coroutines.flow.Flow

@Dao
interface TaskDao {
    @Query("SELECT * FROM tasks ORDER BY date DESC")
    fun getAllTasks(): Flow<List<Task>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTask(task: Task)

    @Delete
    suspend fun deleteTask(task: Task)
}`,
                                                                    analysis: {
                                                                        role: "Data Access Object (DAO)",
                                                                        description: "The interface between your Kotlin code and the SQL database.",
                                                                        purpose: "To abstract SQL queries into method calls.",
                                                                        flow: "Called by Repository to fetch/save data.",
                                                                        functions: [
                                                                            "getAllTasks (Read)",
                                                                            "insertTask (Write)",
                                                                            "deleteTask (Delete)"
                                                                        ],
                                                                        usage: "Used whenever the app needs to touch the database.",
                                                                        connections: [
                                                                            { label: "Task Database", path: "app/src/main/java/com/example/taskmanagerpro/data/local/TaskDatabase.kt" }
                                                                        ]
                                                                    }
                                                                }
                                                            }
                                                        },
                                                        "model": {
                                                            name: "model",
                                                            type: "package",
                                                            isOpen: false,
                                                            analysis: {
                                                                role: "Data Models",
                                                                description: "Contains POJOs (Plain Old Java Objects) or Data Classes.",
                                                                purpose: "To define the shape of data.",
                                                                flow: "Used throughout the app to pass data around.",
                                                                functions: ["Data Definition"],
                                                                usage: "Defining what a 'Task' looks like.",
                                                                connections: [],
                                                                standards: "Keep these simple. No business logic in models."
                                                            },
                                                            children: {
                                                                "Task.kt": {
                                                                    name: "Task.kt",
                                                                    type: "file",
                                                                    language: "kotlin",
                                                                    content: `package com.example.taskmanagerpro.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.Date

@Entity(tableName = "tasks")
data class Task(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val title: String,
    val description: String,
    val isCompleted: Boolean = false,
    val date: Long = System.currentTimeMillis()
)`,
                                                                    analysis: {
                                                                        role: "Data Entity",
                                                                        description: "A simple data class representing a single Task.",
                                                                        purpose: "To map a Kotlin object to a database row.",
                                                                        flow: "Retrieved from DB -> Converted to Task Object -> Displayed in UI.",
                                                                        functions: [
                                                                            "Holds Data (title, desc)",
                                                                            "Implements Room Entity Mapping"
                                                                        ],
                                                                        usage: "Passed between Layers (Data -> Domain -> UI).",
                                                                        connections: [
                                                                            { label: "Task Database", path: "app/src/main/java/com/example/taskmanagerpro/data/local/TaskDatabase.kt" }
                                                                        ]
                                                                    }
                                                                }
                                                            }
                                                        },
                                                        "repository": {
                                                            name: "repository",
                                                            type: "package",
                                                            isOpen: false,
                                                            analysis: {
                                                                role: "Repository Layer",
                                                                description: "The mediator between Data Sources and ViewModels.",
                                                                purpose: "Single Source of Truth. Decides whether to fetch from Local DB or Network.",
                                                                flow: "ViewModel asks Repository for data -> Repository decides where to get it.",
                                                                functions: ["Data Arbitration", "API Abstraction"],
                                                                usage: "The only class that ViewModels should talk to for data.",
                                                                connections: [],
                                                                standards: "Repository Pattern is a core Android Architectural component."
                                                            },
                                                            children: {
                                                                "TaskRepository.kt": {
                                                                    name: "TaskRepository.kt",
                                                                    type: "file",
                                                                    language: "kotlin",
                                                                    content: `package com.example.taskmanagerpro.data.repository

import com.example.taskmanagerpro.data.local.TaskDao
import com.example.taskmanagerpro.data.model.Task
import javax.inject.Inject

class TaskRepository @Inject constructor(
    private val taskDao: TaskDao
) {
    val allTasks = taskDao.getAllTasks()

    suspend fun add(task: Task) = taskDao.insertTask(task)

    suspend fun remove(task: Task) = taskDao.deleteTask(task)
}`,
                                                                    analysis: {
                                                                        role: "Repository",
                                                                        description: "The 'Source of Truth' for data. It hides the complexity of <i>where</i> data comes from (Local DB, Cloud, Cache) from the UI.",
                                                                        purpose: "To provide a clean API for the ViewModel.",
                                                                        flow: "MainViewModel calls add() -> Repository calls Dao.insert().",
                                                                        functions: [
                                                                            "Expose Data Stream (allTasks)",
                                                                            "Perform Async Operations (add, remove)"
                                                                        ],
                                                                        usage: "Injected into ViewModels.",
                                                                        connections: [
                                                                            { label: "Task DAO", path: "app/src/main/java/com/example/taskmanagerpro/data/local/TaskDao.kt" },
                                                                            { label: "MainViewModel", path: "app/src/main/java/com/example/taskmanagerpro/ui/main/MainViewModel.kt" }
                                                                        ]
                                                                    }
                                                                },
                                                                "AuthRepository.kt": {
                                                                    name: "AuthRepository.kt",
                                                                    type: "file",
                                                                    language: "kotlin",
                                                                    content: `package com.example.taskmanagerpro.data.repository

import kotlinx.coroutines.delay
import javax.inject.Inject

class AuthRepository @Inject constructor() {

    // Simulated network call
    suspend fun authenticate(email: String, pass: String): Boolean {
        delay(1000) // Mock latency
        return email.isNotEmpty() && pass.length >= 6
    }

    suspend fun register(name: String, email: String, pass: String): Boolean {
        delay(1500) // Mock latency
        return name.isNotEmpty() && email.isNotEmpty() && pass.length >= 6
    }
}`,
                                                                    analysis: {
                                                                        role: "Auth Repository",
                                                                        description: "Handles user authentication logic.",
                                                                        purpose: "To communicate with the backend for login/register.",
                                                                        flow: "AuthViewModel -> AuthRepository -> (Network Call).",
                                                                        functions: [
                                                                            "authenticate(email, pass)",
                                                                            "register(name, email, pass)"
                                                                        ],
                                                                        usage: "Used by Login and Register ViewModels.",
                                                                        connections: [
                                                                            { label: "AuthViewModel", path: "app/src/main/java/com/example/taskmanagerpro/ui/auth/AuthViewModel.kt" }
                                                                        ]
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                },
                                                "di": {
                                                    name: "di",
                                                    type: "package",
                                                    isOpen: false,
                                                    analysis: {
                                                        role: "Dependency Injection",
                                                        description: "Contains Hilt Modules.",
                                                        purpose: "To teach Hilt how to create dependencies.",
                                                        flow: "Generated code uses these modules to fulfill @Inject requests.",
                                                        functions: ["Dependency Provision"],
                                                        usage: "Configuration only.",
                                                        connections: [],
                                                        standards: "Keeps object creation logic out of business logic classes."
                                                    },
                                                    children: {
                                                        "AppModule.kt": {
                                                            name: "AppModule.kt",
                                                            type: "file",
                                                            language: "kotlin",
                                                            content: `package com.example.taskmanagerpro.di

import android.content.Context
import androidx.room.Room
import com.example.taskmanagerpro.data.local.TaskDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext app: Context) =
        Room.databaseBuilder(app, TaskDatabase::class.java, "task_db").build()

    @Provides
    @Singleton
    fun provideDao(db: TaskDatabase) = db.taskDao()
}`,
                                                            analysis: {
                                                                role: "Hilt DI Module",
                                                                description: "Instructions for how to create dependencies that we don't own (like the Room Database).",
                                                                purpose: "To provide instances of classes that are not constructor-injected.",
                                                                flow: "Hilt calls provideDatabase() when a Repository needs a DB.",
                                                                functions: [
                                                                    "provideDatabase (Singleton)",
                                                                    "provideDao"
                                                                ],
                                                                usage: "Automatically used by Hilt.",
                                                                connections: [
                                                                    { label: "Task Database", path: "app/src/main/java/com/example/taskmanagerpro/data/local/TaskDatabase.kt" }
                                                                ]
                                                            }
                                                        }
                                                    }
                                                },
                                                "ui": {
                                                    name: "ui",
                                                    type: "package",
                                                    isOpen: true,
                                                    analysis: {
                                                        role: "User Interface Layer",
                                                        description: "Contains Activities, Fragments, ViewModels, and Adapters.",
                                                        purpose: "To present data to the user and capture interactions.",
                                                        flow: "Observes Data Layer -> Renders UI.",
                                                        functions: ["Screen Rendering", "User Input Handling"],
                                                        usage: "Everything the user sees.",
                                                        connections: [],
                                                        standards: "MVVM (Model-View-ViewModel) is the standard pattern here."
                                                    },
                                                    children: {
                                                        "auth": {
                                                            name: "auth",
                                                            type: "package",
                                                            isOpen: false,
                                                            analysis: {
                                                                role: "Feature Package (Auth)",
                                                                description: "Encapsulates login and registration screens.",
                                                                purpose: "Grouping by feature makes large apps manageable.",
                                                                flow: "User starts here.",
                                                                functions: ["Feature Organization"],
                                                                usage: "Modular code organization.",
                                                                connections: [],
                                                                standards: "Package-by-feature is preferred over package-by-layer."
                                                            },
                                                            children: {
                                                                "LoginActivity.kt": {
                                                                    name: "LoginActivity.kt",
                                                                    type: "file",
                                                                    language: "kotlin",
                                                                    content: `package com.example.taskmanagerpro.ui.auth

import android.content.Intent
import android.os.Bundle
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.example.taskmanagerpro.databinding.ActivityLoginBinding
import com.example.taskmanagerpro.ui.main.MainActivity
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class LoginActivity : AppCompatActivity() {
    private lateinit var binding: ActivityLoginBinding
    private val viewModel: AuthViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnLogin.setOnClickListener {
            viewModel.login(
                binding.etEmail.text.toString(),
                binding.etPassword.text.toString()
            )
        }

        binding.btnRegister.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
        }

        viewModel.loginState.observe(this) { success ->
            if (success) {
                startActivity(Intent(this, MainActivity::class.java))
                finish()
            }
        }
    }
}`,
                                                                    analysis: {
                                                                        role: "Login Activity (View)",
                                                                        description: "The visual entry point for authentication.",
                                                                        purpose: "To allow users to sign in.",
                                                                        flow: "User enters creds -> Click Login -> VM validates -> Navigate to Main.",
                                                                        functions: [
                                                                            "Setup UI (onCreate)",
                                                                            "Handle Click Events",
                                                                            "Navigate to RegisterActivity"
                                                                        ],
                                                                        usage: "First screen launched by the OS.",
                                                                        connections: [
                                                                            { label: "AuthViewModel", path: "app/src/main/java/com/example/taskmanagerpro/ui/auth/AuthViewModel.kt" },
                                                                            { label: "RegisterActivity", path: "app/src/main/java/com/example/taskmanagerpro/ui/auth/RegisterActivity.kt" },
                                                                            { label: "XML Layout", path: "app/src/main/res/layout/activity_login.xml" }
                                                                        ]
                                                                    }
                                                                },
                                                                "RegisterActivity.kt": {
                                                                    name: "RegisterActivity.kt",
                                                                    type: "file",
                                                                    language: "kotlin",
                                                                    content: `package com.example.taskmanagerpro.ui.auth

import android.os.Bundle
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.example.taskmanagerpro.databinding.ActivityRegisterBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class RegisterActivity : AppCompatActivity() {
    private lateinit var binding: ActivityRegisterBinding
    private val viewModel: AuthViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRegisterBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnRegister.setOnClickListener {
            viewModel.register(
                binding.etName.text.toString(),
                binding.etEmail.text.toString(),
                binding.etPassword.text.toString()
            )
        }

        viewModel.registerState.observe(this) { success ->
            if (success) {
                Toast.makeText(this, "Registration Success!", Toast.LENGTH_SHORT).show()
                finish() // Go back to Login
            }
        }
    }
}`,
                                                                    analysis: {
                                                                        role: "Register Activity (View)",
                                                                        description: "Screen for creating a new account.",
                                                                        purpose: "User acquisition.",
                                                                        flow: "User fills form -> VM registers -> Success Toast -> Back to Login.",
                                                                        functions: [
                                                                            "Collect User Data",
                                                                            "Observe Registration State"
                                                                        ],
                                                                        usage: "Accessed via LoginActivity.",
                                                                        connections: [
                                                                            { label: "AuthViewModel", path: "app/src/main/java/com/example/taskmanagerpro/ui/auth/AuthViewModel.kt" },
                                                                            { label: "XML Layout", path: "app/src/main/res/layout/activity_register.xml" }
                                                                        ]
                                                                    }
                                                                },
                                                                "AuthViewModel.kt": {
                                                                    name: "AuthViewModel.kt",
                                                                    type: "file",
                                                                    language: "kotlin",
                                                                    content: `package com.example.taskmanagerpro.ui.auth

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.taskmanagerpro.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val repository: AuthRepository
) : ViewModel() {

    private val _loginState = MutableLiveData<Boolean>()
    val loginState: LiveData<Boolean> = _loginState

    private val _registerState = MutableLiveData<Boolean>()
    val registerState: LiveData<Boolean> = _registerState

    fun login(email: String, pass: String) {
        viewModelScope.launch {
            val result = repository.authenticate(email, pass)
            _loginState.value = result
        }
    }

    fun register(name: String, email: String, pass: String) {
        viewModelScope.launch {
            val result = repository.register(name, email, pass)
            _registerState.value = result
        }
    }
}`,
                                                                    analysis: {
                                                                        role: "Auth ViewModel",
                                                                        description: "The brain of the Auth feature. Shared between Login and Register activities.",
                                                                        purpose: "To hold state and business logic for authentication.",
                                                                        flow: "Receives input -> Calls Repository -> Updates LiveData -> UI reacts.",
                                                                        functions: [
                                                                            "login()",
                                                                            "register()",
                                                                            "Expose State (loginState, registerState)"
                                                                        ],
                                                                        usage: "Injected into Activities.",
                                                                        connections: [
                                                                            { label: "LoginActivity", path: "app/src/main/java/com/example/taskmanagerpro/ui/auth/LoginActivity.kt" },
                                                                            { label: "RegisterActivity", path: "app/src/main/java/com/example/taskmanagerpro/ui/auth/RegisterActivity.kt" }
                                                                        ]
                                                                    }
                                                                }
                                                            }
                                                        },
                                                        "main": {
                                                            name: "main",
                                                            type: "package",
                                                            isOpen: true,
                                                            analysis: {
                                                                role: "Feature Package (Main)",
                                                                description: "Contains the main functionality of the app (Task list).",
                                                                purpose: "To group the primary user journey.",
                                                                flow: "User arrives here after login.",
                                                                functions: ["Task List Management"],
                                                                usage: "Core application loop.",
                                                                connections: [],
                                                                standards: "Main feature often needs its own package."
                                                            },
                                                            children: {
                                                                "MainActivity.kt": {
                                                                    name: "MainActivity.kt",
                                                                    type: "file",
                                                                    language: "kotlin",
                                                                    content: `package com.example.taskmanagerpro.ui.main

import android.os.Bundle
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.taskmanagerpro.databinding.ActivityMainBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private val viewModel: MainViewModel by viewModels()
    private val adapter = TaskAdapter()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupRecyclerView()

        viewModel.tasks.observe(this) { tasks ->
            adapter.submitList(tasks)
        }

        binding.fabAddTask.setOnClickListener {
            AddTaskDialogFragment().show(supportFragmentManager, "add_task")
        }
    }

    private fun setupRecyclerView() {
        binding.rvTasks.apply {
            layoutManager = LinearLayoutManager(this@MainActivity)
            adapter = this@MainActivity.adapter
        }
    }
}`,
                                                                    analysis: {
                                                                        role: "Main Activity",
                                                                        description: "The central hub of the app. Displays the list of tasks.",
                                                                        purpose: "To display the list of tasks and facilitate adding new ones.",
                                                                        flow: "Observes ViewModel -> Updates Adapter -> RecyclerView draws list.",
                                                                        functions: [
                                                                            "Initialize RecyclerView",
                                                                            "Observe Task List",
                                                                            "Launch Add Dialog"
                                                                        ],
                                                                        usage: "Main user interface.",
                                                                        connections: [
                                                                            { label: "MainViewModel", path: "app/src/main/java/com/example/taskmanagerpro/ui/main/MainViewModel.kt" },
                                                                            { label: "Add Task Dialog", path: "app/src/main/java/com/example/taskmanagerpro/ui/main/AddTaskDialogFragment.kt" },
                                                                            { label: "XML Layout", path: "app/src/main/res/layout/activity_main.xml" }
                                                                        ]
                                                                    }
                                                                },
                                                                "AddTaskDialogFragment.kt": {
                                                                    name: "AddTaskDialogFragment.kt",
                                                                    type: "file",
                                                                    language: "kotlin",
                                                                    content: `package com.example.taskmanagerpro.ui.main

import android.app.Dialog
import android.os.Bundle
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.activityViewModels
import com.example.taskmanagerpro.databinding.DialogAddTaskBinding
import com.google.android.material.dialog.MaterialAlertDialogBuilder

class AddTaskDialogFragment : DialogFragment() {
    // Shared ViewModel with Activity
    private val viewModel: MainViewModel by activityViewModels()

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val binding = DialogAddTaskBinding.inflate(layoutInflater)

        return MaterialAlertDialogBuilder(requireContext())
            .setTitle("New Task")
            .setView(binding.root)
            .setPositiveButton("Add") { _, _ ->
                viewModel.addTask(
                    binding.etTitle.text.toString(),
                    binding.etDesc.text.toString()
                )
            }
            .setNegativeButton("Cancel", null)
            .create()
    }
}`,
                                                                    analysis: {
                                                                        role: "Dialog Fragment",
                                                                        description: "A modal popup to create new tasks.",
                                                                        purpose: "To capture input without leaving the main screen.",
                                                                        flow: "Input -> ViewModel.addTask() -> Dismiss.",
                                                                        functions: [
                                                                            "Render Dialog UI",
                                                                            "Capture User Input",
                                                                            "Communicate with Shared ViewModel"
                                                                        ],
                                                                        usage: "Triggered by FAB.",
                                                                        connections: [
                                                                            { label: "MainViewModel", path: "app/src/main/java/com/example/taskmanagerpro/ui/main/MainViewModel.kt" },
                                                                            { label: "XML Layout", path: "app/src/main/res/layout/dialog_add_task.xml" }
                                                                        ]
                                                                    }
                                                                },
                                                                "MainViewModel.kt": {
                                                                    name: "MainViewModel.kt",
                                                                    type: "file",
                                                                    language: "kotlin",
                                                                    content: `package com.example.taskmanagerpro.ui.main

import androidx.lifecycle.ViewModel
import androidx.lifecycle.asLiveData
import androidx.lifecycle.viewModelScope
import com.example.taskmanagerpro.data.model.Task
import com.example.taskmanagerpro.data.repository.TaskRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    private val repository: TaskRepository
) : ViewModel() {

    val tasks = repository.allTasks.asLiveData()

    fun addTask(title: String, description: String) {
        viewModelScope.launch {
            val task = Task(title = title, description = description)
            repository.add(task)
        }
    }

    fun deleteTask(task: Task) {
        viewModelScope.launch {
            repository.remove(task)
        }
    }
}`,
                                                                    analysis: {
                                                                        role: "Main ViewModel",
                                                                        description: "Bridge between Repository and UI.",
                                                                        purpose: "To manage data for the MainActivity.",
                                                                        flow: "Repository -> LiveData -> Activity.",
                                                                        functions: [
                                                                            "Expose tasks LiveData",
                                                                            "addTask()",
                                                                            "deleteTask()"
                                                                        ],
                                                                        usage: "Injected into MainActivity.",
                                                                        connections: [
                                                                            { label: "Task Repository", path: "app/src/main/java/com/example/taskmanagerpro/data/repository/TaskRepository.kt" },
                                                                            { label: "MainActivity", path: "app/src/main/java/com/example/taskmanagerpro/ui/main/MainActivity.kt" }
                                                                        ]
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                "res": {
                                    name: "res",
                                    type: "folder",
                                    isOpen: true,
                                    analysis: {
                                        role: "Resources",
                                        description: "Static content (layouts, strings, images).",
                                        purpose: "To separate code from content.",
                                        flow: "Compiled into a binary format accessed via the R class.",
                                        functions: ["UI Definition", "Asset Management"],
                                        usage: "Layouts, Strings, Colors, Drawables.",
                                        connections: [],
                                        standards: "Never hardcode strings or dimensions in Java/Kotlin code."
                                    },
                                    children: {
                                        "layout": {
                                            name: "layout",
                                            type: "folder",
                                            isOpen: true,
                                            analysis: {
                                                role: "Layouts Folder",
                                                description: "XML files defining UI structure.",
                                                purpose: "To define how screens look.",
                                                flow: "Inflated by Activity/Fragment to become View objects.",
                                                functions: ["UI Structure Definition"],
                                                usage: "One file per screen or component.",
                                                connections: [],
                                                standards: "Use constraint layouts for complex screens."
                                            },
                                            children: {
                                                "activity_login.xml": {
                                                    name: "activity_login.xml",
                                                    type: "file",
                                                    language: "xml",
                                                    content: `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center"
    android:padding="24dp">

    <EditText
        android:id="@+id/etEmail"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:hint="Email Address"
        android:inputType="textEmailAddress" />

    <EditText
        android:id="@+id/etPassword"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:hint="Password"
        android:inputType="textPassword"
        android:layout_marginTop="16dp" />

    <Button
        android:id="@+id/btnLogin"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Login"
        android:layout_marginTop="24dp" />

    <TextView
        android:id="@+id/btnRegister"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="New here? Register"
        android:textColor="@color/purple_500"
        android:layout_marginTop="16dp" />

</LinearLayout>`,
                                                    analysis: {
                                                        role: "Login Layout",
                                                        description: "A simple vertical stack of views using LinearLayout.",
                                                        purpose: "UI for LoginActivity.",
                                                        flow: "Inflated in LoginActivity.onCreate().",
                                                        functions: [
                                                            "Email Input",
                                                            "Password Input",
                                                            "Login Button",
                                                            "Register Link"
                                                        ],
                                                        usage: "Visuals for login.",
                                                        connections: [
                                                            { label: "LoginActivity", path: "app/src/main/java/com/example/taskmanagerpro/ui/auth/LoginActivity.kt" }
                                                        ]
                                                    }
                                                },
                                                "activity_register.xml": {
                                                    name: "activity_register.xml",
                                                    type: "file",
                                                    language: "xml",
                                                    content: `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center"
    android:padding="24dp">

    <EditText
        android:id="@+id/etName"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:hint="Full Name"
        android:inputType="textPersonName" />

    <EditText
        android:id="@+id/etEmail"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="16dp"
        android:hint="Email Address"
        android:inputType="textEmailAddress" />

    <EditText
        android:id="@+id/etPassword"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:hint="Password"
        android:inputType="textPassword"
        android:layout_marginTop="16dp" />

    <Button
        android:id="@+id/btnRegister"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Create Account"
        android:layout_marginTop="24dp" />

</LinearLayout>`,
                                                    analysis: {
                                                        role: "Register Layout",
                                                        description: "UI for the Registration screen.",
                                                        purpose: "Collect user details.",
                                                        flow: "Inflated in RegisterActivity.",
                                                        functions: [
                                                            "Name Input",
                                                            "Email Input",
                                                            "Password Input",
                                                            "Submit Button"
                                                        ],
                                                        usage: "Visuals for registration.",
                                                        connections: [
                                                            { label: "RegisterActivity", path: "app/src/main/java/com/example/taskmanagerpro/ui/auth/RegisterActivity.kt" }
                                                        ]
                                                    }
                                                },
                                                "activity_main.xml": {
                                                    name: "activity_main.xml",
                                                    type: "file",
                                                    language: "xml",
                                                    content: `<?xml version="1.0" encoding="utf-8"?>
<androidx.coordinatorlayout.widget.CoordinatorLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <androidx.recyclerview.widget.RecyclerView
        android:id="@+id/rvTasks"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:clipToPadding="false"
        android:paddingBottom="80dp" />

    <com.google.android.material.floatingactionbutton.FloatingActionButton
        android:id="@+id/fabAddTask"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_gravity="bottom|end"
        android:layout_margin="16dp"
        android:src="@drawable/ic_add"
        app:tint="@color/white" />

</androidx.coordinatorlayout.widget.CoordinatorLayout>`,
                                                    analysis: {
                                                        role: "Main Layout",
                                                        description: "CoordinatorLayout is used here to allow for advanced interactions (like the FAB interacting with Snackbars).",
                                                        purpose: "Main screen UI container.",
                                                        flow: "Holds the RecyclerView.",
                                                        functions: [
                                                            "List Container (RecyclerView)",
                                                            "Add Button (FAB)"
                                                        ],
                                                        usage: "Visuals for main screen.",
                                                        connections: [
                                                            { label: "MainActivity", path: "app/src/main/java/com/example/taskmanagerpro/ui/main/MainActivity.kt" }
                                                        ]
                                                    }
                                                },
                                                "dialog_add_task.xml": {
                                                    name: "dialog_add_task.xml",
                                                    type: "file",
                                                    language: "xml",
                                                    content: `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:padding="16dp">

    <com.google.android.material.textfield.TextInputLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:hint="Task Title">

        <com.google.android.material.textfield.TextInputEditText
            android:id="@+id/etTitle"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"/>
    </com.google.android.material.textfield.TextInputLayout>

    <com.google.android.material.textfield.TextInputLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="12dp"
        android:hint="Description">

        <com.google.android.material.textfield.TextInputEditText
            android:id="@+id/etDesc"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"/>
    </com.google.android.material.textfield.TextInputLayout>

</LinearLayout>`,
                                                    analysis: {
                                                        role: "Dialog Layout",
                                                        description: "The content view for the 'Add Task' dialog.",
                                                        purpose: "Input form for new tasks.",
                                                        flow: "Shown inside a DialogFragment.",
                                                        functions: [
                                                            "Title Input",
                                                            "Description Input"
                                                        ],
                                                        usage: "Visuals for adding a task.",
                                                        connections: [
                                                            { label: "AddTaskDialogFragment", path: "app/src/main/java/com/example/taskmanagerpro/ui/main/AddTaskDialogFragment.kt" }
                                                        ]
                                                    }
                                                }
                                            }
                                        },
                                        "values": {
                                            name: "values",
                                            type: "folder",
                                            isOpen: false,
                                            analysis: {
                                                role: "Values Folder",
                                                description: "Simple values like strings, colors, dimensions.",
                                                purpose: "Centralization of constants.",
                                                flow: "Referenced in XML as @string/name or in code as R.string.name.",
                                                functions: ["Constant Storage"],
                                                usage: "Stores all text/colors.",
                                                connections: [],
                                                standards: "Values are locale-aware (e.g., values-es for Spanish)."
                                            },
                                            children: {
                                                "strings.xml": {
                                                    name: "strings.xml",
                                                    type: "file",
                                                    language: "xml",
                                                    content: `<resources>
    <string name="app_name">TaskManager Pro</string>
    <string name="welcome_message">Welcome back!</string>
</resources>`,
                                                    analysis: {
                                                        role: "Resource File",
                                                        description: "Separating strings from code is best practice for Internationalization (i18n).",
                                                        purpose: "To allow translation of the app without changing code.",
                                                        flow: "Android loads the correct string based on device language.",
                                                        functions: ["Text Definitions"],
                                                        usage: "All UI text.",
                                                        connections: [],
                                                        standards: "Every UI string must be here, not hardcoded."
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

/* =========================================
   LOGIC & RENDERING
   ========================================= */

const treeContainer = document.getElementById('project-tree');
const codeEditor = document.getElementById('code-editor');
const lineNumbers = document.getElementById('line-numbers');
const breadcrumbs = document.getElementById('breadcrumbs');
const inspectorPanel = document.getElementById('inspector-panel');
const emptyState = document.getElementById('empty-state');

// State to track currently selected path
let selectedPath = null;

// ---- TREE RENDERER ----

function renderTree(node, path = "", level = 0) {
    const currentPath = path ? `${path}/${node.name}` : node.name;
    const paddingLeft = level * 20 + 12; // Indentation

    const itemDiv = document.createElement('div');
    itemDiv.className = `tree-item flex items-center py-1 pr-2 ${selectedPath === currentPath ? 'selected' : 'text-gray-400'}`;
    itemDiv.style.paddingLeft = `${paddingLeft}px`;

    // Icon
    let iconName = 'folder';
    let iconColor = 'text-gray-500';

    if (node.type === 'file') {
        if (node.name.endsWith('.kt')) {
            iconName = 'kotlin'; // We'll use a code icon for simplicity or custom image
            iconColor = 'text-purple-400';
        } else if (node.name.endsWith('.xml')) {
            iconName = 'code';
            iconColor = 'text-orange-400';
        } else {
            iconName = 'description';
            iconColor = 'text-gray-400';
        }
    } else if (node.type === 'package') {
        iconName = 'folder_open'; // Simplified
        iconColor = 'text-gray-500';
    }

    // Handle special icons manually since Material Symbols might not have specific brand logos like Kotlin
    const iconHtml = (node.name.endsWith('.kt'))
        ? `<span class="font-bold text-xs mr-2 text-purple-400 select-none">K</span>`
        : `<span class="material-symbols-rounded text-lg mr-1 ${iconColor} select-none">${iconName}</span>`;

    // Arrow for folders
    const arrowHtml = (node.type === 'folder' || node.type === 'package')
        ? `<span class="material-symbols-rounded text-base mr-1 text-gray-500 select-none transform transition-transform ${node.isOpen ? 'rotate-90' : ''}">arrow_right</span>`
        : `<span class="w-5 mr-1"></span>`; // Spacer

    itemDiv.innerHTML = `${arrowHtml}${iconHtml}<span class="truncate">${node.name}</span>`;

    // Click Handler
    itemDiv.onclick = (e) => {
        e.stopPropagation();

        // Always update inspector if analysis exists, for both files and folders
        if (node.analysis) {
            updateInspector(node);
        }

        if (node.type === 'folder' || node.type === 'package') {
            node.isOpen = !node.isOpen;
            selectedPath = currentPath; // Also select folders
            refreshTree();
        } else {
            selectedPath = currentPath;
            openFile(node, currentPath);
            refreshTree();
        }
    };

    const fragment = document.createDocumentFragment();
    fragment.appendChild(itemDiv);

    if ((node.type === 'folder' || node.type === 'package') && node.isOpen && node.children) {
        // Sort: Folders first, then files
        const childrenKeys = Object.keys(node.children).sort((a, b) => {
            const nodeA = node.children[a];
            const nodeB = node.children[b];
            const typeA = (nodeA.type === 'folder' || nodeA.type === 'package') ? 0 : 1;
            const typeB = (nodeB.type === 'folder' || nodeB.type === 'package') ? 0 : 1;
            if (typeA !== typeB) return typeA - typeB;
            return a.localeCompare(b);
        });

        childrenKeys.forEach(key => {
            fragment.appendChild(renderTree(node.children[key], currentPath, level + 1));
        });
    }

    return fragment;
}

function refreshTree() {
    treeContainer.innerHTML = '';
    treeContainer.appendChild(renderTree(fileSystem));
}

// ---- FILE VIEWER ----

function openFile(node, path) {
    emptyState.style.display = 'none';

    // Breadcrumbs
    breadcrumbs.innerHTML = path.split('/').map((part, index, arr) => {
        const isLast = index === arr.length - 1;
        return `
            <span class="flex items-center">
                <span class="${isLast ? 'text-gray-200 font-bold' : 'hover:text-white cursor-pointer'}">${part}</span>
                ${!isLast ? '<span class="mx-1 opacity-50">/</span>' : ''}
            </span>
        `;
    }).join('');

    // Code Content
    const highlightedCode = syntaxHighlight(node.content, node.language);
    codeEditor.innerHTML = highlightedCode;

    // Line Numbers
    const lineCount = node.content.split('\n').length;
    lineNumbers.innerHTML = Array.from({length: lineCount}, (_, i) => `<div>${i + 1}</div>`).join('');
}

function syntaxHighlight(code, language) {
    // Escape HTML to prevent execution
    let cleanCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    if (language === 'kotlin') {
        // Use placeholders to prevent regex overlapping
        const strings = [];
        cleanCode = cleanCode.replace(/(".*?")/g, (match) => {
            strings.push(match);
            return `___STRING${strings.length - 1}___`;
        });

        // Keywords
        const keywords = ["package", "import", "class", "interface", "fun", "val", "var", "return", "if", "else", "for", "while", "true", "false", "null", "this", "super", "object", "companion", "override", "private", "public", "protected", "internal", "lateinit", "constructor", "init", "try", "catch", "finally", "suspend", "data", "sealed", "open", "abstract", "enum"];
        keywords.forEach(kw => {
            // Ensure we don't match inside existing tags (though placeholders prevent this mostly)
            const regex = new RegExp(`\\b${kw}\\b`, 'g');
            cleanCode = cleanCode.replace(regex, `<span class="hl-keyword">${kw}</span>`);
        });

        // Restore strings
        cleanCode = cleanCode.replace(/___STRING(\d+)___/g, (match, i) => {
            return `<span class="hl-string">${strings[i]}</span>`;
        });

        // Annotations
        cleanCode = cleanCode.replace(/(@\w+)/g, '<span class="hl-annotation">$1</span>');
        // Numbers
        cleanCode = cleanCode.replace(/\b(\d+)\b/g, '<span class="hl-number">$1</span>');
        // Functions (simplified detection: word followed by parenthesis)
        cleanCode = cleanCode.replace(/\b(\w+)(?=\()/g, '<span class="hl-function">$1</span>');

    } else if (language === 'xml') {
        // Comments
        cleanCode = cleanCode.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="hl-comment">$1</span>');
        // Tags
        cleanCode = cleanCode.replace(/(&lt;\/?)([\w:.]+)/g, '$1<span class="hl-tag">$2</span>');
        // Attributes
        cleanCode = cleanCode.replace(/(\s)([\w:.-]+)(=)/g, '$1<span class="hl-attribute">$2</span>$3');
        // Attribute Values
        cleanCode = cleanCode.replace(/(".*?")/g, '<span class="hl-value">$1</span>');
    }

    return cleanCode;
}

// ---- INSPECTOR ----

function findNodeByPath(path) {
    const parts = path.split('/');
    let current = fileSystem;
    // Skip root if name matches, or just traverse
    if (parts[0] === fileSystem.name) {
        parts.shift();
    }

    for (const part of parts) {
        if (current.children && current.children[part]) {
            current = current.children[part];
        } else {
            return null;
        }
    }
    return current;
}

function updateInspector(node) {
    if (!node.analysis) return;

    const { role, description, purpose, flow, functions, usage, connections, standards } = node.analysis;

    const connectionsHtml = connections && connections.length ? connections.map(conn => {
        return `
            <div class="group flex items-start p-2 rounded hover:bg-[#3c3f41] cursor-pointer transition-colors mb-1"
                 onclick="navigateToPath('${conn.path}')">
                <span class="material-symbols-rounded text-blue-400 text-lg mr-2 mt-0.5">link</span>
                <div>
                    <div class="text-blue-300 font-medium text-xs group-hover:underline">${conn.label}</div>
                    <div class="text-gray-500 text-[10px] truncate w-48">${conn.path.split('/').pop()}</div>
                </div>
            </div>
        `;
    }).join('') : '<div class="text-gray-600 italic text-xs">No direct connections linked.</div>';

    const functionsHtml = functions && functions.length ?
        `<ul class="list-disc list-inside text-gray-300 text-xs space-y-1 ml-1">
            ${functions.map(f => `<li>${f}</li>`).join('')}
         </ul>` : '<span class="text-gray-500 text-xs italic">N/A</span>';

    const standardHtml = standards ?
        `<div class="mt-4 p-2 bg-[#3a2e2e] rounded border border-[#503030]">
            <div class="flex items-center text-orange-300 mb-1">
                <span class="material-symbols-rounded text-sm mr-1">verified</span>
                <span class="text-[10px] font-bold uppercase">Pro Standard</span>
            </div>
            <p class="text-gray-300 text-xs italic">${standards}</p>
         </div>` : '';

    inspectorPanel.innerHTML = `
        <div class="animate-fade-in space-y-4">
            <!-- Header -->
            <div class="bg-[#323232] rounded p-3 border border-[#3e3e42]">
                <div class="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Component Role</div>
                <div class="text-base font-semibold text-green-400">${role}</div>
            </div>

            <!-- Meaning / Description -->
            <div>
                <div class="text-xs font-bold text-gray-400 mb-1 uppercase flex items-center">
                    <span class="material-symbols-rounded text-sm mr-1">info</span> Description
                </div>
                <p class="text-gray-300 text-sm leading-relaxed">${description}</p>
            </div>

            <!-- Purpose -->
            ${purpose ? `
            <div>
                <div class="text-xs font-bold text-gray-400 mb-1 uppercase flex items-center">
                    <span class="material-symbols-rounded text-sm mr-1">target</span> Purpose
                </div>
                <p class="text-gray-300 text-xs leading-relaxed">${purpose}</p>
            </div>` : ''}

            <!-- Flow -->
            ${flow ? `
            <div>
                <div class="text-xs font-bold text-gray-400 mb-1 uppercase flex items-center">
                    <span class="material-symbols-rounded text-sm mr-1">schema</span> Flow
                </div>
                <p class="text-gray-300 text-xs leading-relaxed bg-[#252526] p-2 rounded border border-[#323232] font-mono">${flow}</p>
            </div>` : ''}

            <!-- Functions -->
            <div>
                <div class="text-xs font-bold text-gray-400 mb-1 uppercase flex items-center">
                    <span class="material-symbols-rounded text-sm mr-1">functions</span> Core Functions
                </div>
                ${functionsHtml}
            </div>

            <!-- Usage -->
            ${usage ? `
            <div>
                <div class="text-xs font-bold text-gray-400 mb-1 uppercase flex items-center">
                    <span class="material-symbols-rounded text-sm mr-1">code_blocks</span> When to use
                </div>
                <p class="text-gray-300 text-xs leading-relaxed">${usage}</p>
            </div>` : ''}

            <!-- Connections -->
            <div>
                <div class="text-xs font-bold text-gray-400 mb-2 uppercase border-b border-gray-700 pb-1">Dependencies & Connections</div>
                <div class="mt-2">
                    ${connectionsHtml}
                </div>
            </div>

            <!-- Standards -->
            ${standardHtml}
        </div>
    `;
}

// Global function for onclick in HTML
window.navigateToPath = (path) => {
    const node = findNodeByPath(path);
    if (node) {
        // We need to reconstruct the full path including root for selection logic
        // The connections paths in data structure seem to start from 'app/...'
        // But our fileSystem root is 'TaskManagerPro'.
        // Let's handle the path construction carefully.

        // Adjust path if it doesn't start with root name
        let fullPath = path;
        if (!path.startsWith(fileSystem.name)) {
             fullPath = `${fileSystem.name}/${path}`;
        }

        selectedPath = fullPath;

        // Check if it is a file or folder to determine action
        if (node.type === 'file') {
            openFile(node, fullPath);
        } else {
            updateInspector(node);
            node.isOpen = true; // Open if it is a folder
        }

        // We also need to expand the tree to show this file
        expandPath(fullPath);
        refreshTree();
    } else {
        console.error("Could not find node for path:", path);
    }
};

function expandPath(path) {
    const parts = path.split('/');
    let current = fileSystem;

    // Traverse and set isOpen = true
    // Skip root name in parts if we start traversing from children of root
    // But here we traverse from root object

    if (parts[0] === fileSystem.name) {
        parts.shift();
    }

    for (const part of parts) {
        if (current.children && current.children[part]) {
            current.isOpen = true;
            current = current.children[part];
        }
    }
}

// Initialize
refreshTree();
// Default select root inspector
updateInspector(fileSystem);
