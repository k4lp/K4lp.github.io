const fileSystem = {
  name: 'app',
  type: 'folder',
  children: [
    {
      name: "build.gradle.kts",
      type: "file",
      code: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.dagger.hilt.android")
}

android {
    namespace = "com.example.demosuperapp"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.demosuperapp"
        minSdk = 24
        targetSdk = 35
        versionCode = 42
        versionName = "5.0.0-alpha"
    }

    buildFeatures {
        dataBinding = true
        viewBinding = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.8.6")
    implementation("androidx.navigation:navigation-fragment-ktx:2.8.3")
    implementation("androidx.room:room-ktx:2.7.0")
    implementation("androidx.work:work-runtime-ktx:2.9.0")
    implementation("androidx.hilt:hilt-work:1.2.0")
    implementation("com.google.dagger:hilt-android:2.52")
    kapt("com.google.dagger:hilt-android-compiler:2.52")
    kapt("androidx.hilt:hilt-compiler:1.2.0")
}`,
      analysis: {
        role: "Build Script",
        description: "Defines compile targets, enables DataBinding/ViewBinding, and wires dependencies for Room, Navigation, and Hilt to support the layered MVVM stack.",
        connections: [
          { label: "Hilt AppModule", target: "app/src/main/java/com/example/demosuperapp/di/AppModule.kt" },
          { label: "Room Database", target: "app/src/main/java/com/example/demosuperapp/data/db/AppDatabase.kt" },
          { label: "Navigation Graph", target: "app/src/main/res/navigation/nav_graph.xml" }
        ]
    }
    },
    {
      name: "docs",
      type: "folder",
      children: [
        {
          name: "ArchitectureFlow.md",
          type: "file",
          code: `# Android Boot + MVVM Flow (SuperApp)

1) **Manifest is read first**: OS parses AndroidManifest.xml, sees Application, launcher Activity, service, provider, deep links.
2) **Application onCreate**: Hilt Dagger graph built before UI; singletons ready (Room, Retrofit, Repos).
3) **MainActivity launched**: Hosts NavHost, inflates activity_main.xml via DataBinding, seeds nav_graph start destination.
4) **Nav graph starts LoginFragment**: Fragment inflates layout, binds to LoginViewModel scoped to Activity for shared state.
5) **User interaction**: Buttons call ViewModel -> UseCases -> Repository -> Auth API + Room cache.
6) **State propagation**: Flow/StateFlow updates UI (loading, errors, popup), Room triggers session observers.
7) **Navigation**: Successful login navigates to DashboardFragment (via nav_graph action), sharing the same ViewModel/state.
8) **Background & system surfaces**: WorkManager (via service) refreshes profile hourly; ContentProvider available pre-UI for IPC; deep links jump straight into login flow.
9) **Resources & layouts**: DataBinding + strings.xml keep UI declarative and localizable.
10) **Edge concerns**: Offline cache (Room), DI scoping (Singleton/Activity), and thread handoff (CoroutineWorker/Dispatchers) are covered.
`,
          analysis: {
            role: "Teaching Guide",
            description: "Step-by-step explanation of how Android boots this app: manifest first, then Application, Activity, navigation, fragments, ViewModels, repos, and background work.",
            flow: [
              "OS reads AndroidManifest.xml to discover Application, Activity, Service, and Provider.",
              "Application (Hilt) builds the dependency graph before any UI is inflated.",
              "MainActivity inflates DataBinding layout and attaches the Navigation graph.",
              "NavHost starts LoginFragment which binds to shared LoginViewModel.",
              "ViewModel calls use cases/repository, which hit Retrofit + Room and emit StateFlow.",
              "State updates cause data-bound layouts to react; nav action moves to Dashboard on success.",
              "WorkManager keeps profile fresh; ContentProvider allows external queries even before UI."
            ],
            before: ["Manifest parsing happens before any Kotlin executes.", "No DI graph exists before Application onCreate."],
            after: ["Students can trace any node in the tree to see its role, connections, and next steps.", "Use this as the north star while navigating files."],
            tags: ["Flow", "Lifecycle", "Teaching"]
          }
        },
        {
          name: "EdgeCases.md",
          type: "file",
          code: `# Edge Cases & Recovery

- Offline start: Room session Flow hydrates UI; WorkManager retries when back online.
- Token expiry: AuthInterceptor (conceptual) reacts to 401 -> clear session -> Login.
- Process death: Manifest -> SuperApp -> Hilt -> MainActivity -> NavGraph recreate; Room/StateFlow restore state.
- Push wake: PushReceiver routes to MainActivity with extras to open target screen.
- Boot completed: BootReceiver schedules SyncScheduler -> WorkManager to pre-warm data.
- Connectivity return: ConnectivityReceiver restarts SyncScheduler when network is back.
- Foreground sync: ForegroundRefreshService runs long actions with notification to stay alive.
- Logout: LogoutUseCase clears session and tokens to return to login safely.
- Error UI: UiEvent.Popup/Error flows show dialog_popup.xml; user can retry actions.
`,
          analysis: {
            role: "Edge Cases",
            description: "Reference for teaching how the app handles offline, token expiry, process death, push, boot, and UI errors.",
            before: ["Use with scenario simulator buttons to narrate resilience behaviors."],
            after: ["Jump into each linked node to see before/after + execution paths."],
            tags: ["Offline", "Token", "Process death", "Push", "Boot"]
          }
        }
      ]
    },
    {
      name: "src",
      type: "folder",
      children: [
        {
          name: "main",
          type: "folder",
          children: [
            {
              name: "manifests",
              type: "folder",
              children: [
                {
                  name: "AndroidManifest.xml",
                  type: "file",
                  code: `<?xml version="1.0" encoding="utf-8"?>
<manifest package="com.example.demosuperapp">

    <!-- The OS reads this first to discover entry points, permissions, and exported surfaces. -->
    <application
        android:name=".SuperApp"
        android:label="SuperApp"
        android:icon="@mipmap/ic_launcher"
        android:theme="@style/Theme.SuperApp">

        <activity
            android:name=".ui.MainActivity"
            android:exported="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="superapp" android:host="login" />
            </intent-filter>
        </activity>

        <service android:name=".data.sync.SyncScheduler" android:exported="false" />
        <service android:name=".data.sync.ForegroundRefreshService" android:exported="false" />
        <provider
            android:name=".data.db.AppProvider"
            android:authorities="com.example.demosuperapp.provider"
            android:exported="false" />

        <receiver
            android:name=".system.BootReceiver"
            android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>

        <receiver
            android:name=".push.PushReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </receiver>

        <receiver
            android:name=".system.ConnectivityReceiver"
            android:exported="false">
            <intent-filter>
                <action android:name="android.net.conn.CONNECTIVITY_CHANGE" />
            </intent-filter>
        </receiver>
    </application>
</manifest>`,
                  analysis: {
                    role: "Manifest & Entry Points",
                    description: "The Android manifest is the first file the OS reads. It registers the Application class, declares MainActivity as the launcher, deep links for login, and background surfaces like the sync service and content provider.",
                    flow: [
                      "OS parses manifest before code; sees Application=SuperApp (Hilt bootstrap).",
                      "Launcher Activity=MainActivity is resolved for MAIN/LAUNCHER.",
                      "Deep link superapp://login maps to MainActivity routing.",
                      "Service SyncScheduler and AppProvider are predeclared for background/IPC."
                    ],
                    before: ["Bootloader hands control to Package Manager; no app code has run yet."],
                    after: ["System instantiates SuperApp, then creates MainActivity on launch.", "Services/providers become eligible to start; deep links open MainActivity with login intent."],
                    tags: ["Entry point", "Permissions", "Deep link"],
                    connections: [
                      { label: "Launches MainActivity", target: "app/src/main/java/com/example/demosuperapp/ui/MainActivity.kt" },
                      { label: "Application Singleton", target: "app/src/main/java/com/example/demosuperapp/SuperApp.kt" },
                      { label: "Navigation Graph", target: "app/src/main/res/navigation/nav_graph.xml" },
                      { label: "Background Service", target: "app/src/main/java/com/example/demosuperapp/data/sync/SyncScheduler.kt" },
                      { label: "Content Provider", target: "app/src/main/java/com/example/demosuperapp/data/db/AppProvider.kt" },
                      { label: "Boot Receiver", target: "app/src/main/java/com/example/demosuperapp/system/BootReceiver.kt" },
                      { label: "Push Receiver", target: "app/src/main/java/com/example/demosuperapp/push/PushReceiver.kt" }
                    ]
                  }
                }
              ]
            },
            {
              name: "java",
              type: "folder",
              children: [
                {
                  name: "com",
                  type: "folder",
                  children: [
                    {
                      name: "example",
                      type: "folder",
                      children: [
                        {
                          name: "demosuperapp",
                          type: "folder",
                          children: [
                            {
                              name: "SuperApp.kt",
                              type: "file",
                              code: `package com.example.demosuperapp

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class SuperApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initializes DI graph before any Activity inflates UI or ViewModel is created.
    }
}
`,
                              analysis: {
                                role: "Application",
                                description: "Bootstraps Hilt so every Activity/Fragment/ViewModel can request dependencies before the first screen renders.",
                                flow: [
                                  "Called immediately after process start, before any Activity.",
                                  "Triggers Hilt code-gen to build SingletonComponent.",
                                  "Makes DI graph ready for MainActivity and Workers."
                                ],
                                before: ["Manifest has just been parsed; process is cold-starting."],
                                after: ["MainActivity can request injected ViewModels.", "Workers/Services can request singletons (Room, Retrofit)."],
                                tags: ["Hilt", "Process start"],
                                connections: [
                                  { label: "Hilt Modules", target: "app/src/main/java/com/example/demosuperapp/di/AppModule.kt" },
                                  { label: "MainActivity", target: "app/src/main/java/com/example/demosuperapp/ui/MainActivity.kt" }
                                ]
                              }
                            },
                            {
                              name: "di",
                              type: "folder",
                              children: [
                                {
                                  name: "AppModule.kt",
                                  type: "file",
                                  code: `package com.example.demosuperapp.di

import android.content.Context
import androidx.room.Room
import com.example.demosuperapp.data.api.AuthApi
import com.example.demosuperapp.data.api.AuthInterceptor
import com.example.demosuperapp.data.db.AppDatabase
import com.example.demosuperapp.data.repo.UserRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides @Singleton
    fun provideDb(@ApplicationContext app: Context) = Room.databaseBuilder(
        app, AppDatabase::class.java, "superapp.db"
    ).fallbackToDestructiveMigration().build()

    @Provides fun provideUserDao(db: AppDatabase) = db.userDao()

    @Provides @Singleton
    fun provideApi(): AuthApi = Retrofit.Builder()
        .baseUrl("https://api.superapp.dev/")
        .client(
            OkHttpClient.Builder()
                .addInterceptor(AuthInterceptor { /* token provider demo */ null })
                .build()
        )
        .addConverterFactory(MoshiConverterFactory.create())
        .build()
        .create(AuthApi::class.java)

    @Provides @Singleton
    fun provideRepo(api: AuthApi, db: AppDatabase) =
        UserRepository(api, db.userDao())
}
`,
                                  analysis: {
                                    role: "Dependency Injection Module",
                                    description: "Creates singleton instances for Room, DAO, Retrofit API, and the shared repository so ViewModels can stay lean.",
                                    flow: [
                                      "Hilt reads @Module @InstallIn to bind providers at app start.",
                                      "provideDb builds Room once; provideApi builds Retrofit client.",
                                      "provideRepo wires Repo with API + DAO, ready for injection."
                                    ],
                                    before: ["Hilt runtime requests these bindings right after SuperApp onCreate."],
                                    after: ["Any injected class receives singletons (Room, Retrofit, Repo) without manual factory code.", "Network calls always pass through the AuthInterceptor."],
                                    tags: ["Hilt", "DI", "Singleton"],
                                    connections: [
                                      { label: "UserRepository", target: "app/src/main/java/com/example/demosuperapp/data/repo/UserRepository.kt" },
                                      { label: "AppDatabase", target: "app/src/main/java/com/example/demosuperapp/data/db/AppDatabase.kt" },
                                      { label: "AuthApi", target: "app/src/main/java/com/example/demosuperapp/data/api/AuthApi.kt" }
                                    ]
                                  }
                                }
                              ]
                            },
                            {
                              name: "data",
                              type: "folder",
                              children: [
                                {
                                  name: "prefs",
                                  type: "folder",
                                  children: [
                                    {
                                      name: "SettingsDataStore.kt",
                                      type: "file",
                                      code: `package com.example.demosuperapp.data.prefs

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.preferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.map

val Context.userPrefs by preferencesDataStore("user_prefs")

class SettingsDataStore(private val context: Context) {
    private val THEME = preferencesKey<String>("theme")

    val theme = context.userPrefs.data.map { it[THEME] ?: "dark" }

    suspend fun setTheme(value: String) {
        context.userPrefs.edit { it[THEME] = value }
    }
}
`,
                                      analysis: {
                                        role: "DataStore",
                                        description: "Persists lightweight key/value state (e.g., theme) to show modern preference storage alongside Room.",
                                        flow: [
                                          "DI can inject SettingsDataStore; flows emit theme values.",
                                          "UI could collect theme to update appearance at runtime."
                                        ],
                                        before: ["AppModule would create this when injected (not shown for brevity)."],
                                        after: ["Theme preference stays across launches; collectors immediately receive latest value."],
                                        tags: ["DataStore", "Preferences", "Flow"],
                                        connections: [
                                          { label: "Injected via Hilt (not shown)", target: "app/src/main/java/com/example/demosuperapp/di/AppModule.kt" },
                                          { label: "Consumed by UI theme", target: "app/src/main/java/com/example/demosuperapp/ui/MainActivity.kt" }
                                        ]
                                      }
                                    }
                                  ]
                                },
                                {
                                  name: "api",
                                  type: "folder",
                                  children: [
                                    {
                                      name: "AuthApi.kt",
                                      type: "file",
                                      code: `package com.example.demosuperapp.data.api

import com.example.demosuperapp.domain.model.User
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface AuthApi {
    @POST("/auth/login")
    suspend fun login(@Body body: Map<String, String>): User

    @POST("/auth/register")
    suspend fun register(@Body body: Map<String, String>): User

    @GET("/user/profile")
    suspend fun profile(): User
}
`,
                                      analysis: {
                                        role: "Network Layer",
                                        description: "Defines REST endpoints for login, register, and fetching user profiles that the repository delegates to.",
                                        connections: [
                                          { label: "UserRepository calls API", target: "app/src/main/java/com/example/demosuperapp/data/repo/UserRepository.kt" },
                                          { label: "User model", target: "app/src/main/java/com/example/demosuperapp/domain/model/User.kt" }
                                        ]
                                      }
                                    }
                                  ]
                                },
                                {
                                  name: "db",
                                  type: "folder",
                                  children: [
                                    {
                                      name: "AppDatabase.kt",
                                      type: "file",
                                      code: `package com.example.demosuperapp.data.db

import androidx.room.Database
import androidx.room.RoomDatabase
import com.example.demosuperapp.domain.model.User

@Database(entities = [User::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
}
`,
                                      analysis: {
                                        role: "Room Database",
                                        description: "Central Room database that exposes DAO access for caching logins and profiles.",
                                        connections: [
                                          { label: "UserDao", target: "app/src/main/java/com/example/demosuperapp/data/db/UserDao.kt" },
                                          { label: "User entity", target: "app/src/main/java/com/example/demosuperapp/domain/model/User.kt" }
                                        ]
                                      }
                                    },
                                    {
                                      name: "UserDao.kt",
                                      type: "file",
                                      code: `package com.example.demosuperapp.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.demosuperapp.domain.model.User
import kotlinx.coroutines.flow.Flow

@Dao
interface UserDao {
    @Query("SELECT * FROM user LIMIT 1")
    fun session(): Flow<User?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(user: User)

    @Query("DELETE FROM user")
    suspend fun clear()
}
`,
                                      analysis: {
                                        role: "DAO",
                                        description: "Streams the current session user and persists it, enabling UI to reactively update with Room Flow.",
                                        connections: [
                                          { label: "Room Database", target: "app/src/main/java/com/example/demosuperapp/data/db/AppDatabase.kt" },
                                          { label: "Repository caches results", target: "app/src/main/java/com/example/demosuperapp/data/repo/UserRepository.kt" }
                                        ]
                                      }
                                    },
                                    {
                                      name: "AppProvider.kt",
                                      type: "file",
                                      code: `package com.example.demosuperapp.data.db

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.net.Uri
import androidx.room.Room

/**
 * Demonstrates inter-app data exchange over a ContentProvider surface while delegating to Room.
 * Android can reach this before any Activity, so it must bootstrap Room safely.
 */
class AppProvider : ContentProvider() {

    private val database by lazy {
        val ctx = requireNotNull(context)
        Room.databaseBuilder(ctx, AppDatabase::class.java, "superapp.db").build()
    }

    override fun onCreate(): Boolean = true

    override fun query(
        uri: Uri,
        projection: Array<out String>?,
        selection: String?,
        selectionArgs: Array<out String>?,
        sortOrder: String?
    ): Cursor? = null // Kept minimal for demo

    override fun insert(uri: Uri, values: ContentValues?): Uri? = null
    override fun getType(uri: Uri): String? = null
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int = 0
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int = 0
}
`,
                                      analysis: {
                                        role: "Content Provider",
                                        description: "Exposes a Room-backed surface for other apps or system components; created before UI, echoing manifest ordering.",
                                        flow: [
                                          "Created by OS when external component resolves provider authority.",
                                          "Initializes Room lazily if accessed pre-Activity.",
                                          "Would delegate CRUD to DAOs (trimmed for demo)."
                                        ],
                                        before: ["Manifest registration makes this available even before Application onCreate finishes."],
                                        after: ["External callers can query/insert; Room stays consistent with in-app cache.", "UI can later read the same Room tables without conflict."],
                                        tags: ["IPC", "Room", "Manifest-first"],
                                        connections: [
                                          { label: "Manifest provider entry", target: "app/src/main/manifests/AndroidManifest.xml" },
                                          { label: "Room database handle", target: "app/src/main/java/com/example/demosuperapp/data/db/AppDatabase.kt" }
                                        ]
                                      }
                                    }
                                    ,
                                    {
                                      name: "AuthInterceptor.kt",
                                      type: "file",
                                      code: `package com.example.demosuperapp.data.api

import okhttp3.Interceptor
import okhttp3.Response

/**
 * Adds bearer token to every call; demonstrates centralized networking concerns.
 */
class AuthInterceptor(private val tokenProvider: () -> String?) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = tokenProvider()
        val newReq = chain.request().newBuilder().apply {
            if (token != null) addHeader("Authorization", "Bearer $token")
        }.build()
        return chain.proceed(newReq)
    }
}
`,
                                      analysis: {
                                        role: "Network Interceptor",
                                        description: "Injects auth headers into Retrofit calls; shows how infrastructure concerns live outside UI/repo.",
                                        before: ["OkHttp client creation in AppModule wires this interceptor."],
                                        after: ["All AuthApi calls carry Authorization header if token exists.", "Downstream APIs can trust bearer propagation."],
                                        connections: [
                                          { label: "OkHttp client in AppModule", target: "app/src/main/java/com/example/demosuperapp/di/AppModule.kt" },
                                          { label: "User token source", target: "app/src/main/java/com/example/demosuperapp/data/db/UserDao.kt" }
                                        ]
                                      }
                                    }
                                  ]
                                },
                                {
                                  name: "repo",
                                  type: "folder",
                                  children: [
                                    {
                                      name: "UserRepository.kt",
                                      type: "file",
                                      code: `package com.example.demosuperapp.data.repo

import com.example.demosuperapp.data.api.AuthApi
import com.example.demosuperapp.data.db.UserDao
import com.example.demosuperapp.domain.model.User
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

class UserRepository(
    private val api: AuthApi,
    private val userDao: UserDao
) {
    val session: Flow<User?> = userDao.session()

    suspend fun login(email: String, password: String): User {
        val user = api.login(mapOf("email" to email, "password" to password))
        userDao.upsert(user)
        return user
    }

    suspend fun register(email: String, password: String): User {
        val user = api.register(mapOf("email" to email, "password" to password))
        userDao.upsert(user)
        return user
    }

    suspend fun refreshProfile(): User {
        val user = api.profile()
        userDao.upsert(user)
        return session.first() ?: user
    }
}
`,
                                      analysis: {
                                        role: "Repository",
                                        description: "Bridges network and database, caching auth responses and exposing a Flow-backed session for ViewModels.",
                                        flow: [
                                          "login/register call AuthApi then persist User via Room.",
                                          "refreshProfile pulls from API, upserts, then returns cached session Flow.",
                                          "ViewModel/Workers consume the same repository path."
                                        ],
                                        before: ["Use cases invoke repo methods from ViewModel or Worker."],
                                        after: ["Room emits session Flow to UI; network responses are cached for offline use.", "AuthInterceptor will attach tokens for subsequent calls."],
                                        tags: ["Repository", "Caching", "Flow"],
                                        connections: [
                                          { label: "LoginViewModel uses repository", target: "app/src/main/java/com/example/demosuperapp/ui/login/LoginViewModel.kt" },
                                          { label: "UserDao", target: "app/src/main/java/com/example/demosuperapp/data/db/UserDao.kt" },
                                          { label: "AuthApi", target: "app/src/main/java/com/example/demosuperapp/data/api/AuthApi.kt" }
                                        ]
                                      }
                                    }
                                  ]
                                },
                                {
                                  name: "sync",
                                  type: "folder",
                                  children: [
                                    {
                                      name: "SyncScheduler.kt",
                                      type: "file",
                                      code: `package com.example.demosuperapp.data.sync

import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/**
 * Started by the manifest-listed service to periodically refresh profile + session cache.
 */
class SyncScheduler : Service() {
    override fun onCreate() {
        super.onCreate()
        val request = PeriodicWorkRequestBuilder<UserRefreshWorker>(1, TimeUnit.HOURS).build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "user-refresh", ExistingPeriodicWorkPolicy.UPDATE, request
        )
    }
    override fun onBind(intent: Intent?): IBinder? = null
}
`,
                                      analysis: {
                                        role: "Background Service",
                                        description: "Bootstraps WorkManager to refresh user profiles hourly, giving the app offline-resilient state even when UI is closed.",
                                        flow: [
                                          "Manifest can start this service; onCreate enqueues periodic work.",
                                          "WorkManager handles battery/constraints; service just schedules.",
                                          "Worker injected with repository to refresh data in background."
                                        ],
                                        before: ["Manifest recognized this service; started either by system or app explicit intent."],
                                        after: ["WorkManager executes UserRefreshWorker hourly; Room cache updates feed UI next open."],
                                        tags: ["Service", "WorkManager", "Background"],
                                        connections: [
                                          { label: "Manifest service entry", target: "app/src/main/manifests/AndroidManifest.xml" },
                                          { label: "Worker uses Repository", target: "app/src/main/java/com/example/demosuperapp/data/sync/UserRefreshWorker.kt" }
                                        ]
                                      }
                                    },
                                    {
                                      name: "UserRefreshWorker.kt",
                                      type: "file",
                                      code: `package com.example.demosuperapp.data.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.demosuperapp.data.repo.UserRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

@HiltWorker
class UserRefreshWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val repo: UserRepository
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result = runCatching {
        repo.refreshProfile()
    }.fold(
        onSuccess = { Result.success() },
        onFailure = { Result.retry() }
    )
}
`,
                                      analysis: {
                                        role: "WorkManager Job",
                                        description: "Uses Hilt-assisted injection inside WorkManager to call the repository, exercising DI scope outside UI threads.",
                                        flow: [
                                          "Enqueued by SyncScheduler; executes on a background thread.",
                                          "Calls repository.refreshProfile; retries on failure.",
                                          "Updates Room -> flows to UI next time ViewModel observes session."
                                        ],
                                        before: ["WorkManager resolved constraints and scheduled this worker from SyncScheduler."],
                                        after: ["Room session table updated; UI observers (ViewModel) get fresh data on next collection.", "Failure triggers retry according to WorkManager policy."],
                                        tags: ["WorkManager", "Hilt", "Coroutines"],
                                        connections: [
                                          { label: "Repository dependency", target: "app/src/main/java/com/example/demosuperapp/data/repo/UserRepository.kt" },
                                          { label: "Scheduled by SyncScheduler", target: "app/src/main/java/com/example/demosuperapp/data/sync/SyncScheduler.kt" }
                                        ]
                                      }
                                    }
                                    ,
                                    {
                                      name: "ForegroundRefreshService.kt",
                                      type: "file",
                                      code: `package com.example.demosuperapp.data.sync

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import com.example.demosuperapp.domain.usecase.RefreshProfileUseCase
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Foreground service to demonstrate long-running user-triggered sync with notification.
 */
@AndroidEntryPoint
class ForegroundRefreshService : Service() {

    @Inject lateinit var refresh: RefreshProfileUseCase
    private val scope = CoroutineScope(Dispatchers.Default)

    override fun onCreate() {
        super.onCreate()
        startInForeground()
        scope.launch {
            refresh()
            stopSelf()
        }
    }

    private fun startInForeground() {
        val channelId = "sync_channel"
        val mgr = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            mgr.createNotificationChannel(
                NotificationChannel(channelId, "Sync", NotificationManager.IMPORTANCE_LOW)
            )
        }
        val notification: Notification = Notification.Builder(this, channelId)
            .setContentTitle("Syncing profile")
            .setContentText("Foreground refresh in progress")
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .build()
        startForeground(1001, notification)
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
`,
                                      analysis: {
                                        role: "Foreground Service",
                                        description: "User-triggered, foreground sync with notification to comply with Android background rules while refreshing profile.",
                                        flow: [
                                          "User action starts service; service enters foreground with notification.",
                                          "Injected RefreshProfileUseCase updates Room via repository.",
                                          "Service stops after completion; UI reads fresh Flow when resumed."
                                        ],
                                        before: ["User explicitly requested a sync or long action."],
                                        after: ["Room cache refreshed; notification dismissed; next UI read is fresh."],
                                        tags: ["ForegroundService", "Notification", "Refresh"],
                                        connections: [
                                          { label: "Manifest service entry", target: "app/src/main/manifests/AndroidManifest.xml" },
                                          { label: "RefreshProfileUseCase", target: "app/src/main/java/com/example/demosuperapp/domain/usecase/RefreshProfileUseCase.kt" }
                                        ]
                                      }
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              name: "push",
                              type: "folder",
                              children: [
                                {
                                  name: "PushReceiver.kt",
                                  type: "file",
                                  code: `package com.example.demosuperapp.push

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.example.demosuperapp.ui.MainActivity

/**
 * Demonstrates a push entry point (e.g., Firebase). Routes into MainActivity with extras.
 */
class PushReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val next = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("from_push", true)
        }
        context.startActivity(next)
    }
}
`,
                                  analysis: {
                                    role: "Push Entry Point",
                                    description: "Receives push events (e.g., FCM) and routes users into MainActivity, simulating notification taps/deep links.",
                                    flow: [
                                      "System delivers push broadcast per manifest intent-filter.",
                                      "Receiver constructs intent to MainActivity with context extras.",
                                      "NavGraph can inspect extras to route to target screen."
                                    ],
                                    before: ["Push transport (FCM) invoked com.google.firebase.MESSAGING_EVENT."],
                                    after: ["MainActivity starts and NavGraph handles routing; optional refresh via use case."],
                                    tags: ["Push", "Deep link", "Entry point"],
                                    connections: [
                                      { label: "Declared in manifest", target: "app/src/main/manifests/AndroidManifest.xml" },
                                      { label: "Routes to MainActivity", target: "app/src/main/java/com/example/demosuperapp/ui/MainActivity.kt" }
                                    ]
                                  }
                                }
                              ]
                            },
                            {
                              name: "system",
                              type: "folder",
                              children: [
                                {
                                  name: "BootReceiver.kt",
                                  type: "file",
                                  code: `package com.example.demosuperapp.system

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.example.demosuperapp.data.sync.SyncScheduler

/**
 * Runs after device boot to warm caches by scheduling background sync.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val serviceIntent = Intent(context, SyncScheduler::class.java)
        context.startService(serviceIntent)
    }
}
`,
                                  analysis: {
                                    role: "Boot Receiver",
                                    description: "Starts post-boot and kicks off SyncScheduler so the app has fresh data before the user opens it.",
                                    flow: [
                                      "System sends BOOT_COMPLETED broadcast.",
                                      "Receiver starts SyncScheduler service.",
                                      "Service enqueues WorkManager jobs to refresh profile."
                                    ],
                                    before: ["Device just booted; no app UI has started."],
                                    after: ["WorkManager refreshes data; Room is warm when user opens MainActivity."],
                                    tags: ["BroadcastReceiver", "Boot", "Background"],
                                    connections: [
                                      { label: "Manifest receiver entry", target: "app/src/main/manifests/AndroidManifest.xml" },
                                      { label: "Starts SyncScheduler", target: "app/src/main/java/com/example/demosuperapp/data/sync/SyncScheduler.kt" }
                                    ]
                                  }
                                },
                                {
                                  name: "ConnectivityReceiver.kt",
                                  type: "file",
                                  code: `package com.example.demosuperapp.system

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.example.demosuperapp.data.sync.SyncScheduler

/**
 * Reacts to connectivity changes to retry background sync when network returns.
 */
class ConnectivityReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val active = cm.activeNetwork
        val caps = cm.getNetworkCapabilities(active)
        val online = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
        if (online) {
            context.startService(Intent(context, SyncScheduler::class.java))
        }
    }
}
`,
                                  analysis: {
                                    role: "Connectivity Receiver",
                                    description: "Listens for connectivity changes; when online, it restarts background sync so cached data refreshes.",
                                    flow: [
                                      "System broadcasts CONNECTIVITY_CHANGE.",
                                      "Receiver checks NetworkCapabilities.",
                                      "If online, it triggers SyncScheduler -> WorkManager."
                                    ],
                                    before: ["Network state just changed; background jobs may have failed while offline."],
                                    after: ["SyncScheduler enqueues refresh; UI benefits on next app open."],
                                    tags: ["BroadcastReceiver", "Connectivity", "Resilience"],
                                    connections: [
                                      { label: "Manifest receiver entry", target: "app/src/main/manifests/AndroidManifest.xml" },
                                      { label: "Starts SyncScheduler", target: "app/src/main/java/com/example/demosuperapp/data/sync/SyncScheduler.kt" }
                                    ]
                                  }
                                }
                              ]
                            },
                            {
                              name: "domain",
                              type: "folder",
                              children: [
                                {
                                  name: "usecase",
                                  type: "folder",
                                  children: [
                                    {
                                      name: "LoginUseCase.kt",
                                      type: "file",
                                      code: `package com.example.demosuperapp.domain.usecase

import com.example.demosuperapp.data.repo.UserRepository
import javax.inject.Inject

class LoginUseCase @Inject constructor(
    private val repo: UserRepository
) {
    suspend operator fun invoke(email: String, password: String) =
        repo.login(email, password)
}
`,
                                      analysis: {
                                        role: "Use Case",
                                        description: "Captures the business rule for logging in, allowing UI to depend on a stable domain boundary instead of the repository directly.",
                                        flow: [
                                          "ViewModel invokes operator() with credentials.",
                                          "Use case forwards to repository.login and returns domain model.",
                                          "Keeps UI decoupled from data sources."
                                        ],
                                        before: ["UI events hit LoginViewModel; ViewModel delegates here."],
                                        after: ["Repository persists session; ViewModel updates StateFlow and triggers navigation."],
                                        tags: ["UseCase", "Domain", "Separation"],
                                        connections: [
                                          { label: "Used by LoginViewModel", target: "app/src/main/java/com/example/demosuperapp/ui/login/LoginViewModel.kt" },
                                          { label: "Backed by repository", target: "app/src/main/java/com/example/demosuperapp/data/repo/UserRepository.kt" }
                                        ]
                                      }
                                    },
                                    {
                                      name: "RefreshProfileUseCase.kt",
                                      type: "file",
                                      code: `package com.example.demosuperapp.domain.usecase

import com.example.demosuperapp.data.repo.UserRepository
import javax.inject.Inject

class RefreshProfileUseCase @Inject constructor(
    private val repo: UserRepository
) {
    suspend operator fun invoke() = repo.refreshProfile()
}
`,
                                      analysis: {
                                        role: "Use Case",
                                        description: "Encapsulates profile refresh so background jobs and UI share the same domain behavior and error handling path.",
                                        flow: [
                                          "Worker or ViewModel calls operator().",
                                          "Use case delegates to repository.refreshProfile.",
                                          "Room emits latest session Flow back to UI."
                                        ],
                                        before: ["Triggered either by background worker or dashboard refresh button."],
                                        after: ["Fresh user entity stored in Room; observers in UI update greeting/profile.", "Next API calls carry updated token if provided."],
                                        tags: ["UseCase", "Domain", "Caching"],
                                        connections: [
                                          { label: "Called by Worker", target: "app/src/main/java/com/example/demosuperapp/data/sync/UserRefreshWorker.kt" },
                                          { label: "Shown in Dashboard", target: "app/src/main/java/com/example/demosuperapp/ui/dashboard/DashboardFragment.kt" }
                                        ]
                                      }
                                    }
                                    ,
                                    {
                                      name: "LogoutUseCase.kt",
                                      type: "file",
                                      code: `package com.example.demosuperapp.domain.usecase

import com.example.demosuperapp.data.db.UserDao
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject

class LogoutUseCase @Inject constructor(
    private val userDao: UserDao
) {
    suspend operator fun invoke() = withContext(Dispatchers.IO) {
        // Clear cached session to simulate logout
        userDao.clear()
    }
}
`,
                                      analysis: {
                                        role: "Logout Use Case",
                                        description: "Demonstrates session termination path; would clear tokens and cached user data to return to login.",
                                        flow: [
                                          "UI/VM calls logout.",
                                          "Use case clears cached session/token.",
                                          "Nav graph returns to login, AuthInterceptor stops sending token."
                                        ],
                                        before: ["User is authenticated; session exists in Room/DataStore."],
                                        after: ["Session cleared; next app start begins at login.", "Network calls without token until re-login."],
                                        tags: ["UseCase", "Logout", "Session"],
                                        connections: [
                                          { label: "Logged in UI triggers", target: "app/src/main/java/com/example/demosuperapp/ui/dashboard/DashboardFragment.kt" },
                                          { label: "Room session cleared", target: "app/src/main/java/com/example/demosuperapp/data/db/UserDao.kt" }
                                        ]
                                      }
                                    }
                                  ]
                                },
                                {
                                  name: "model",
                                  type: "folder",
                                  children: [
                                    {
                                      name: "User.kt",
                                      type: "file",
                                      code: `package com.example.demosuperapp.domain.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "user")
data class User(
    @PrimaryKey val id: String,
    val email: String,
    val displayName: String,
    val token: String,
    val tier: String = "pro"
)
`,
                                      analysis: {
                                        role: "Domain Model",
                                        description: "Normalized representation of an authenticated user shared by network, database, and UI layers.",
                                        connections: [
                                          { label: "Room Entity", target: "app/src/main/java/com/example/demosuperapp/data/db/AppDatabase.kt" },
                                          { label: "Displayed by Dashboard", target: "app/src/main/java/com/example/demosuperapp/ui/dashboard/DashboardFragment.kt" }
                                        ]
                                      }
                                    }
                                  ]
                                }
                              ]
                            },
                                {
                                  name: "ui",
                                  type: "folder",
                                  children: [
                                {
                                  name: "common",
                                  type: "folder",
                                  children: [
                                    {
                                      name: "UiEvent.kt",
                                      type: "file",
                                      code: `package com.example.demosuperapp.ui.common

sealed interface UiEvent {
    data class Popup(val message: String) : UiEvent
    data class Error(val reason: String) : UiEvent
}
`,
                                      analysis: {
                                        role: "UI Event Contract",
                                        description: "A small sealed interface to unify one-shot events like popups or errors across fragments, avoiding LiveData wrappers.",
                                        connections: [
                                          { label: "Emitted by ViewModels", target: "app/src/main/java/com/example/demosuperapp/ui/login/LoginViewModel.kt" },
                                          { label: "Consumed by fragments", target: "app/src/main/java/com/example/demosuperapp/ui/dashboard/DashboardFragment.kt" }
                                        ]
                                      }
                                    }
                                  ]
                                },
                                {
                                  name: "MainActivity.kt",
                                  type: "file",
                                  code: `package com.example.demosuperapp.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.viewModels
import androidx.databinding.DataBindingUtil
import androidx.navigation.findNavController
import com.example.demosuperapp.R
import com.example.demosuperapp.databinding.ActivityMainBinding
import com.example.demosuperapp.ui.login.LoginViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private lateinit var binding: ActivityMainBinding
    private val authViewModel: LoginViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = DataBindingUtil.setContentView(this, R.layout.activity_main)
        binding.lifecycleOwner = this
        binding.viewModel = authViewModel

        // Android lifecycle hits here after manifest discovery; then nav_graph drives screen flow.
        findNavController(R.id.nav_host_fragment).setGraph(R.navigation.nav_graph, intent.extras)
    }
}
`,
                                  analysis: {
                                    role: "Activity Shell",
                                    description: "Entry Activity uses DataBinding and Navigation to host login, register, and dashboard flows.",
                                    flow: [
                                      "OS launches MainActivity after manifest resolution.",
                                      "DataBinding inflates activity_main.xml and attaches NavHost.",
                                      "NavHost loads nav_graph start destination (LoginFragment).",
                                      "Shared LoginViewModel scoped to Activity for cross-screen reuse."
                                    ],
                                    before: ["SuperApp built the DI graph; manifest selected MainActivity from launcher intent."],
                                    after: ["NavGraph drives to LoginFragment; ViewModels resolve via Hilt scopes.", "User actions here lead to login/register and later navigation to Dashboard."],
                                    tags: ["Activity", "Navigation", "DataBinding"],
                                    connections: [
                                      { label: "Navigation graph", target: "app/src/main/res/navigation/nav_graph.xml" },
                                      { label: "LoginViewModel", target: "app/src/main/java/com/example/demosuperapp/ui/login/LoginViewModel.kt" },
                                      { label: "Activity layout", target: "app/src/main/res/layout/activity_main.xml" }
                                    ]
                                  }
                                },
                                {
                                  name: "login",
                                  type: "folder",
                                  children: [
                                    {
                                      name: "LoginViewModel.kt",
                                      type: "file",
                                      code: `package com.example.demosuperapp.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.demosuperapp.domain.usecase.LoginUseCase
import com.example.demosuperapp.domain.usecase.RefreshProfileUseCase
import com.example.demosuperapp.domain.usecase.LogoutUseCase
import com.example.demosuperapp.ui.common.UiEvent
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val login: LoginUseCase,
    private val refreshProfile: RefreshProfileUseCase,
    private val logoutUseCase: LogoutUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState
    private val _events = MutableStateFlow<UiEvent?>(null)
    val events: StateFlow<UiEvent?> = _events

    fun login(email: String, password: String) = viewModelScope.launch {
        _uiState.value = _uiState.value.copy(loading = true, error = null)
        runCatching { login(email, password) }
            .onSuccess { _uiState.value = _uiState.value.copy(loading = false, signedIn = true) }
            .onFailure { _uiState.value = _uiState.value.copy(loading = false, error = it.message) }
    }

    fun register(email: String, password: String) = viewModelScope.launch {
        _uiState.value = _uiState.value.copy(loading = true, error = null)
        runCatching { login(email, password) } // reuse login flow after register event
            .onSuccess { _uiState.value = _uiState.value.copy(loading = false, signedIn = true, popup = "Welcome!") }
            .onFailure { _uiState.value = _uiState.value.copy(loading = false, error = it.message) }
    }

    fun refresh() = viewModelScope.launch {
        runCatching { refreshProfile() }
            .onSuccess { _uiState.value = _uiState.value.copy(popup = "Profile refreshed") }
    }

    fun logout() = viewModelScope.launch {
        logoutUseCase()
        _uiState.value = LoginUiState()
        _events.value = UiEvent.Popup("Logged out")
    }
}

data class LoginUiState(
    val loading: Boolean = false,
    val signedIn: Boolean = false,
    val popup: String? = null,
    val error: String? = null
)
`,
                                      analysis: {
                                        role: "ViewModel",
                                        description: "Holds UI state for login, registration, and profile refresh while delegating business rules to domain use cases and exposing popup/error flags for dialogs.",
                                        flow: [
                                          "UI buttons call login/register/refresh -> ViewModel methods.",
                                          "ViewModel forwards to use cases (domain) instead of talking to repo directly.",
                                          "StateFlow pushes loading/success/error to bound layouts.",
                                          "Nav graph observes signedIn to move to dashboard; popup field triggers dialogs."
                                        ],
                                        before: ["Fragment/Activity have already obtained this ViewModel via Hilt and set up data binding."],
                                        after: ["On success, navigation proceeds to DashboardFragment.", "On errors/popup, UI shows dialogs/snackbars; repository/Room persist session for next app start."],
                                        tags: ["ViewModel", "StateFlow", "UseCase"],
                                        connections: [
                                          { label: "LoginUseCase + RefreshProfileUseCase", target: "app/src/main/java/com/example/demosuperapp/domain/usecase/LoginUseCase.kt" },
                                          { label: "Login Fragment layout", target: "app/src/main/res/layout/fragment_login.xml" },
                                          { label: "View binding in MainActivity", target: "app/src/main/java/com/example/demosuperapp/ui/MainActivity.kt" }
                                        ]
                                      }
                                    }
                                    ,
                                    {
                                      name: "LoginFragment.kt",
                                      type: "file",
                                      code: `package com.example.demosuperapp.ui.login

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.example.demosuperapp.databinding.FragmentLoginBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class LoginFragment : Fragment() {

    private var binding: FragmentLoginBinding? = null
    private val viewModel: LoginViewModel by viewModels({ requireActivity() })

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        val b = FragmentLoginBinding.inflate(inflater, container, false)
        binding = b
        b.lifecycleOwner = viewLifecycleOwner
        b.viewModel = viewModel
        b.login.setOnClickListener {
            viewModel.login(b.email.text.toString(), b.password.text.toString())
        }
        b.register.setOnClickListener {
            viewModel.register(b.email.text.toString(), b.password.text.toString())
        }
        return b.root
    }
}
`,
                                      analysis: {
                                        role: "Fragment Controller",
                                        description: "Middle layer that binds layout widgets to the ViewModel, launching login or register actions and reacting to popup flags.",
                                        flow: [
                                          "Inflates fragment_login.xml via ViewBinding/DataBinding.",
                                          "Hooks buttons to ViewModel login/register.",
                                          "Shares Activity-scoped ViewModel for state continuity across navigation."
                                        ],
                                        before: ["MainActivity/NavHost selected LoginFragment as start destination."],
                                        after: ["Successful login triggers nav action to Dashboard.", "Errors/popup values surface as dialogs/snackbars."],
                                        tags: ["Fragment", "DataBinding", "Navigation"],
                                        connections: [
                                          { label: "Login layout", target: "app/src/main/res/layout/fragment_login.xml" },
                                          { label: "Navigation graph start", target: "app/src/main/res/navigation/nav_graph.xml" },
                                          { label: "ViewModel injected", target: "app/src/main/java/com/example/demosuperapp/ui/login/LoginViewModel.kt" }
                                        ]
                                      }
                                    }
                                  ]
                                },
                                {
                                  name: "dashboard",
                                  type: "folder",
                                  children: [
                                    {
                                      name: "DashboardFragment.kt",
                                      type: "file",
code: `package com.example.demosuperapp.ui.dashboard

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.example.demosuperapp.databinding.FragmentDashboardBinding
import com.example.demosuperapp.ui.login.LoginViewModel
import dagger.hilt.android.AndroidEntryPoint
import android.content.Intent
import com.example.demosuperapp.data.sync.ForegroundRefreshService
import androidx.navigation.fragment.findNavController
import com.example.demosuperapp.R

@AndroidEntryPoint
class DashboardFragment : Fragment() {

    private var binding: FragmentDashboardBinding? = null
    private val authViewModel: LoginViewModel by viewModels({ requireActivity() })

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        val b = FragmentDashboardBinding.inflate(inflater, container, false)
        binding = b

        b.lifecycleOwner = viewLifecycleOwner
        b.viewModel = authViewModel
        b.userGreeting.text = "Hello, " + (authViewModel.uiState.value.popup ?: "Pro User")
        b.refresh.setOnClickListener { authViewModel.refresh() }
        b.sync.setOnClickListener { startForegroundService(Intent(requireContext(), ForegroundRefreshService::class.java)) }
        b.logout.setOnClickListener {
            authViewModel.logout()
            findNavController().navigate(R.id.action_dashboard_to_login)
        }
        return b.root
    }
}
`,
                                      analysis: {
                                        role: "UI Layer",
                                        description: "Shares the ViewModel with MainActivity to read session state, displaying dashboard contents after login.",
                                        flow: [
                                          "Fragment inflates fragment_dashboard.xml and binds shared ViewModel.",
                                          "Reads uiState.popup/session to greet user.",
                                          "Refresh button triggers ViewModel.refresh -> use case -> repo -> API/DB."
                                        ],
                                        before: ["Nav action from LoginFragment landed here after successful auth."],
                                        after: ["Profile refresh updates Room/Flow; UI reacts instantly.", "Back navigation returns to login if stack not popped inclusive."],
                                        tags: ["Fragment", "Shared ViewModel", "DataBinding"],
                                        connections: [
                                          { label: "LoginViewModel shared", target: "app/src/main/java/com/example/demosuperapp/ui/login/LoginViewModel.kt" },
                                          { label: "Dashboard layout", target: "app/src/main/res/layout/fragment_dashboard.xml" }
                                        ]
                                      }
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              name: "res",
              type: "folder",
              children: [
                {
                  name: "layout",
                  type: "folder",
                  children: [
                    {
                      name: "activity_main.xml",
                      type: "file",
                      code: `<layout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto">
    <data>
        <variable
            name="viewModel"
            type="com.example.demosuperapp.ui.login.LoginViewModel" />
    </data>

    <androidx.coordinatorlayout.widget.CoordinatorLayout
        android:layout_width="match_parent"
        android:layout_height="match_parent">

        <fragment
            android:id="@+id/nav_host_fragment"
            android:name="androidx.navigation.fragment.NavHostFragment"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            app:defaultNavHost="true"
            app:navGraph="@navigation/nav_graph" />
    </androidx.coordinatorlayout.widget.CoordinatorLayout>
</layout>`,
                      analysis: {
                        role: "Activity Layout",
                        description: "Hosts the Navigation component and binds the shared LoginViewModel for dialogs and snackbars at the activity scope.",
                        connections: [
                          { label: "MainActivity binds here", target: "app/src/main/java/com/example/demosuperapp/ui/MainActivity.kt" },
                          { label: "Navigation graph", target: "app/src/main/res/navigation/nav_graph.xml" }
                        ]
                      }
                    },
                    {
                      name: "fragment_login.xml",
                      type: "file",
                      code: `<layout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto">
    <data>
        <variable name="viewModel" type="com.example.demosuperapp.ui.login.LoginViewModel" />
    </data>
    <androidx.constraintlayout.widget.ConstraintLayout
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:padding="24dp">

        <EditText
            android:id="@+id/email"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:hint="Email"
            app:layout_constraintStart_toStartOf="parent"
            app:layout_constraintEnd_toEndOf="parent"
            app:layout_constraintTop_toTopOf="parent" />

        <EditText
            android:id="@+id/password"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:hint="Password"
            android:inputType="textPassword"
            app:layout_constraintStart_toStartOf="parent"
            app:layout_constraintEnd_toEndOf="parent"
            app:layout_constraintTop_toBottomOf="@id/email"
            android:layout_marginTop="12dp" />

        <Button
            android:id="@+id/login"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:text='@{viewModel.uiState.loading ? "Loading..." : "Login"}'
            app:layout_constraintTop_toBottomOf="@id/password"
            app:layout_constraintStart_toStartOf="parent"
            app:layout_constraintEnd_toEndOf="parent"
            android:onClick='@{() -> viewModel.login(email.text.toString(), password.text.toString())}' />

        <Button
            android:id="@+id/register"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:text="Register"
            app:layout_constraintTop_toBottomOf="@id/login"
            app:layout_constraintStart_toStartOf="parent"
            app:layout_constraintEnd_toEndOf="parent"
            android:onClick='@{() -> viewModel.register(email.text.toString(), password.text.toString())}' />

        <TextView
            android:id="@+id/error"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:text='@{viewModel.uiState.error}'
            android:visibility='@{viewModel.uiState.error != null ? View.VISIBLE : View.GONE}'
            app:layout_constraintTop_toBottomOf="@id/register"
            app:layout_constraintStart_toStartOf="parent"
            app:layout_constraintEnd_toEndOf="parent" />
    </androidx.constraintlayout.widget.ConstraintLayout>
</layout>`,
                      analysis: {
                        role: "Login Layout with DataBinding",
                        description: "Uses two-way binding to send text input into the ViewModel and toggles buttons to show loading/error states. Represents multi-layer UI with validation.",
                        connections: [
                          { label: "LoginViewModel", target: "app/src/main/java/com/example/demosuperapp/ui/login/LoginViewModel.kt" },
                          { label: "Navigation to dashboard", target: "app/src/main/res/navigation/nav_graph.xml" }
                        ]
                      }
                    },
                    {
                      name: "fragment_dashboard.xml",
                      type: "file",
                      code: `<layout xmlns:android="http://schemas.android.com/apk/res/android">
    <data>
        <variable name="viewModel" type="com.example.demosuperapp.ui.login.LoginViewModel" />
    </data>
    <ScrollView
        android:layout_width="match_parent"
        android:layout_height="match_parent">
        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="vertical"
            android:padding="24dp">
            <TextView
                android:id="@+id/userGreeting"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:textSize="20sp"
                android:textStyle="bold"
                android:text='@{"Hello, " + (viewModel.uiState.popup != null ? viewModel.uiState.popup : "Pro User")}' />
            <Button
                android:id="@+id/refresh"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:text="Refresh Profile" />
            <Button
                android:id="@+id/sync"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:text="Foreground Sync" />
            <Button
                android:id="@+id/logout"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:text="Logout" />
        </LinearLayout>
    </ScrollView>
</layout>`,
                      analysis: {
                        role: "Dashboard Layout",
                        description: "Shows a personalized greeting plus controls to trigger profile refresh via shared ViewModel; demonstrates data-bound multi-screen state.",
                        connections: [
                          { label: "DashboardFragment", target: "app/src/main/java/com/example/demosuperapp/ui/dashboard/DashboardFragment.kt" },
                          { label: "ViewModel state read", target: "app/src/main/java/com/example/demosuperapp/ui/login/LoginViewModel.kt" }
                        ]
                      }
                    },
                    {
                      name: "dialog_popup.xml",
                      type: "file",
                      code: `<layout xmlns:android="http://schemas.android.com/apk/res/android">
    <data>
        <variable name="message" type="String" />
    </data>
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="20dp">
        <TextView
            android:id="@+id/popupMessage"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text='@{message}'
            android:textSize="16sp"
            android:textColor="@android:color/white" />
    </LinearLayout>
</layout>`,
                      analysis: {
                        role: "Popup Layout",
                        description: "Simple dialog template to show one-shot UI events coming from ViewModels, tying together event streams and UI popups.",
                        connections: [
                          { label: "Emitted by UiEvent.Popup", target: "app/src/main/java/com/example/demosuperapp/ui/common/UiEvent.kt" },
                          { label: "Shown by fragments", target: "app/src/main/java/com/example/demosuperapp/ui/dashboard/DashboardFragment.kt" }
                        ]
                      }
                    }
                  ]
                },
                {
                  name: "navigation",
                  type: "folder",
                  children: [
                    {
                      name: "nav_graph.xml",
                      type: "file",
                      code: `<navigation xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:id="@+id/nav_graph"
    app:startDestination="@id/loginFragment">

    <fragment
        android:id="@+id/loginFragment"
        android:name="com.example.demosuperapp.ui.login.LoginFragment"
        android:label="Login">
        <action
            android:id="@+id/action_login_to_dashboard"
            app:destination="@id/dashboardFragment"
            app:popUpToInclusive="true" />
    </fragment>

    <fragment
        android:id="@+id/dashboardFragment"
        android:name="com.example.demosuperapp.ui.dashboard.DashboardFragment"
        android:label="Dashboard">
        <action
            android:id="@+id/action_dashboard_to_login"
            app:destination="@id/loginFragment"
            app:popUpTo="@id/loginFragment"
            app:popUpToInclusive="true" />
    </fragment>
</navigation>`,
                      analysis: {
                        role: "Navigation Graph",
                        description: "Defines screen transitions from login/register to dashboard, mirroring how Android moves from MainActivity to fragments after manifest discovery.",
                        flow: [
                          "MainActivity sets this graph on NavHost.",
                          "Start destination -> LoginFragment.",
                          "Action action_login_to_dashboard pops and navigates to DashboardFragment."
                        ],
                        before: ["MainActivity already inflated activity_main.xml with NavHost."],
                        after: ["LoginFragment appears first; upon success, DashboardFragment replaces it per action config."],
                        tags: ["Navigation", "Graph", "Fragments"],
                        connections: [
                          { label: "MainActivity sets graph", target: "app/src/main/java/com/example/demosuperapp/ui/MainActivity.kt" },
                          { label: "Login layout", target: "app/src/main/res/layout/fragment_login.xml" },
                          { label: "Dashboard layout", target: "app/src/main/res/layout/fragment_dashboard.xml" }
                        ]
                      }
                    }
                  ]
                },
                {
                  name: "values",
                  type: "folder",
                  children: [
                    {
                      name: "strings.xml",
                      type: "file",
                      code: `<resources>
    <string name="app_name">SuperApp</string>
    <string name="login">Login</string>
    <string name="register">Register</string>
    <string name="dashboard">Dashboard</string>
    <string name="popup_generic">One-shot popup message placeholder</string>
</resources>`,
                      analysis: {
                        role: "String Resources",
                        description: "Centralizes user-facing text to support localization and keeps layouts free from hardcoded strings.",
                        connections: [
                          { label: "Referenced by layouts", target: "app/src/main/res/layout/fragment_login.xml" },
                          { label: "App label", target: "app/src/main/manifests/AndroidManifest.xml" }
                        ]
                      }
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
