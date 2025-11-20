
/* =========================================
   DATA STRUCTURE & MOCK FILE SYSTEM
   ========================================= */

const fileSystem = {
    name: "TaskManagerPro",
    type: "folder",
    isOpen: true,
    children: {
        "app": {
            name: "app",
            type: "folder",
            isOpen: true,
            children: {
                "manifests": {
                    name: "manifests",
                    type: "folder",
                    isOpen: false,
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

        <activity android:name=".ui.main.MainActivity" />
    </application>

</manifest>`,
                            analysis: {
                                role: "App Manifest",
                                description: "The <b>AndroidManifest.xml</b> is the 'passport' of your app. It tells the Android OS essential information before the app can even run. <br><br>Key concepts here:<br>• <b>Permissions:</b> Requests access to Internet.<br>• <b>Application:</b> Declares the custom Application class.<br>• <b>Activities:</b> Registers every screen. Note the <code>intent-filter</code> on LoginActivity, making it the starting point.",
                                connections: [
                                    { label: "Application Class", path: "app/src/main/java/com/example/taskmanagerpro/TaskApplication.kt" },
                                    { label: "LoginActivity", path: "app/src/main/java/com/example/taskmanagerpro/ui/auth/LoginActivity.kt" }
                                ]
                            }
                        }
                    }
                },
                "src": {
                    name: "src",
                    type: "folder",
                    isOpen: true,
                    children: {
                        "main": {
                            name: "main",
                            type: "folder",
                            isOpen: true,
                            children: {
                                "java": {
                                    name: "java",
                                    type: "folder",
                                    isOpen: true,
                                    children: {
                                        "com.example.taskmanagerpro": {
                                            name: "com.example.taskmanagerpro",
                                            type: "package",
                                            isOpen: true,
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
                                                        description: "This class runs before any Activity. <br><br>• <b>@HiltAndroidApp:</b> This annotation is crucial for Dependency Injection (DI). It triggers Hilt's code generation, allowing you to inject dependencies throughout the app.<br>• <b>Global Init:</b> It's the perfect place to initialize global libraries like logging (Timber).",
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
                                                    children: {
                                                        "local": {
                                                            name: "local",
                                                            type: "package",
                                                            isOpen: false,
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
                                                                        description: "Defines the local database configuration using the Room library.<br><br>• <b>Entities:</b> Lists the tables (Task).<br>• <b>DAOs:</b> Exposes the Data Access Objects used to read/write data.<br>This abstraction saves you from writing raw SQLite code.",
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
                                                                        description: "The interface between your Kotlin code and the SQL database.<br><br>• <b>@Query:</b> Write SQL queries here.<br>• <b>Flow:</b> Returns a stream of data. When the DB changes, the UI updates automatically.<br>• <b>suspend:</b> Indicates these functions run asynchronously (off the main thread).",
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
                                                                        description: "A simple data class representing a single Task.<br><br>• <b>@Entity:</b> Tells Room to create a table named 'tasks' with these columns.<br>• <b>@PrimaryKey:</b> Defines the unique ID for each row.",
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
                                                                        description: "The 'Source of Truth' for data. It hides the complexity of <i>where</i> data comes from (Local DB, Cloud, Cache) from the UI.<br><br>• <b>@Inject:</b> Requests Hilt to provide the 'TaskDao'.",
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
}`,
                                                                    analysis: {
                                                                        role: "Auth Repository",
                                                                        description: "Handles user authentication logic.<br><br>In a real app, this would call a remote API (like Firebase or a REST server). Here, it simulates a network delay and checks basic validation.",
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
                                                                description: "Instructions for how to create dependencies that we don't own (like the Room Database).<br><br>• <b>@Provides:</b> Tells Hilt 'Here is how you create an instance of X'.<br>• <b>Singleton:</b> Ensures only one database instance exists for the whole app lifecycle.",
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
                                                    children: {
                                                        "auth": {
                                                            name: "auth",
                                                            type: "package",
                                                            isOpen: false,
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
                                                                        description: "The visual entry point for authentication.<br><br>• <b>@AndroidEntryPoint:</b> Required for Hilt to inject the ViewModel.<br>• <b>Binding:</b> Uses ViewBinding to access UI elements safely.<br>• <b>Observation:</b> Listens to 'loginState' from the ViewModel to decide when to navigate.",
                                                                        connections: [
                                                                            { label: "AuthViewModel", path: "app/src/main/java/com/example/taskmanagerpro/ui/auth/AuthViewModel.kt" },
                                                                            { label: "XML Layout", path: "app/src/main/res/layout/activity_login.xml" }
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

    fun login(email: String, pass: String) {
        viewModelScope.launch {
            val result = repository.authenticate(email, pass)
            _loginState.value = result
        }
    }
}`,
                                                                    analysis: {
                                                                        role: "Auth ViewModel",
                                                                        description: "The brain of the Login screen. It holds state (login success/fail) and handles business logic.<br><br>It does NOT know about the View (Activity), making it testable and independent of UI lifecycle.",
                                                                        connections: [
                                                                            { label: "LoginActivity", path: "app/src/main/java/com/example/taskmanagerpro/ui/auth/LoginActivity.kt" },
                                                                            { label: "Auth Repository", path: "app/src/main/java/com/example/taskmanagerpro/data/repository/AuthRepository.kt" }
                                                                        ]
                                                                    }
                                                                }
                                                            }
                                                        },
                                                        "main": {
                                                            name: "main",
                                                            type: "package",
                                                            isOpen: true,
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
                                                                        description: "The central hub of the app. Displays the list of tasks.<br><br>• <b>RecyclerView:</b> Efficiently lists dynamic data.<br>• <b>Fab Click:</b> Launches the 'Add Task' dialog.",
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
                                                                        description: "A modal popup to create new tasks.<br><br>• <b>sharedViewModel:</b> Uses 'activityViewModels()' to share the SAME MainViewModel instance as the Activity, allowing it to easily pass data back without callbacks.",
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
                                                                        description: "Bridge between Repository and UI.<br><br>• <b>LiveData:</b> 'tasks' is a LiveData stream observed by MainActivity.<br>• <b>viewModelScope:</b> Ensures coroutines (like DB writes) are cancelled automatically if the ViewModel is cleared, preventing memory leaks.",
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
                                    children: {
                                        "layout": {
                                            name: "layout",
                                            type: "folder",
                                            isOpen: true,
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

</LinearLayout>`,
                                                    analysis: {
                                                        role: "Login Layout",
                                                        description: "A simple vertical stack of views using LinearLayout.<br><br>Includes email/password fields and a login button.",
                                                        connections: [
                                                            { label: "LoginActivity", path: "app/src/main/java/com/example/taskmanagerpro/ui/auth/LoginActivity.kt" }
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
                                                        description: "CoordinatorLayout is used here to allow for advanced interactions (like the FAB interacting with Snackbars).<br>It holds the main list (RecyclerView).",
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
                                                        description: "The content view for the 'Add Task' dialog.<br>Uses Material Components for styled text input fields.",
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
                                                        description: "Separating strings from code is best practice for Internationalization (i18n). You can have multiple versions of this file for different languages (e.g., values-es/strings.xml).",
                                                        connections: []
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

        if (node.type === 'folder' || node.type === 'package') {
            node.isOpen = !node.isOpen;
            refreshTree(); // Re-render tree to show/hide children
        } else {
            selectedPath = currentPath;
            openFile(node, currentPath);
            refreshTree(); // Re-render to update selection highlight
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

    // Inspector
    updateInspector(node);
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

    const { role, description, connections } = node.analysis;

    const connectionsHtml = connections.map(conn => {
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
    }).join('');

    inspectorPanel.innerHTML = `
        <div class="animate-fade-in">
            <div class="bg-[#323232] rounded p-3 mb-4 border border-[#3e3e42]">
                <div class="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Component Role</div>
                <div class="text-base font-semibold text-green-400">${role}</div>
            </div>

            <div class="mb-6">
                <div class="text-xs font-bold text-gray-400 mb-2 uppercase">Analysis</div>
                <p class="text-gray-300 leading-relaxed">${description}</p>
            </div>

            <div>
                <div class="text-xs font-bold text-gray-400 mb-2 uppercase border-b border-gray-700 pb-1">Dependencies & Connections</div>
                <div class="mt-2">
                    ${connectionsHtml.length ? connectionsHtml : '<div class="text-gray-600 italic">No direct connections linked.</div>'}
                </div>
            </div>
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
        openFile(node, fullPath);

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
