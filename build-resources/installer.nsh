; Custom NSIS installer script for YouTube Playlist Manager
; This script adds custom installation behavior and checks

!include MUI2.nsh
!include x64.nsh

; Add custom pages and functionality
!insertmacro MUI_PAGE_WELCOME

; Check for prerequisites
Function CheckPrerequisites
  ; Check for Windows version
  ${If} ${AtLeastWin10}
    ; Windows 10 or later
  ${Else}
    MessageBox MB_ICONSTOP "YouTube Playlist Manager requires Windows 10 or later."
    Abort
  ${EndIf}
  
  ; Check for available disk space (minimum 500MB)
  ${GetRoot} "$INSTDIR" $R0
  ${DriveSpace} "$R0" "/D=F /S=M" $R1
  ${If} $R1 < 500
    MessageBox MB_ICONSTOP "Insufficient disk space. At least 500MB of free space is required."
    Abort
  ${EndIf}
FunctionEnd

; Custom installation steps
Section "Core Application" SecCore
  SectionIn RO ; Required section
  
  ; Set output path
  SetOutPath "$INSTDIR"
  
  ; Install application files
  File /r "${BUILD_RESOURCES_DIR}\app\*"
  
  ; Create registry entries
  WriteRegStr HKCU "Software\YouTube Playlist Manager" "InstallPath" "$INSTDIR"
  WriteRegStr HKCU "Software\YouTube Playlist Manager" "Version" "${VERSION}"
  
  ; Register file associations
  WriteRegStr HKCR ".ytpm" "" "YouTubePlaylistManager.File"
  WriteRegStr HKCR "YouTubePlaylistManager.File" "" "YouTube Playlist Manager File"
  WriteRegStr HKCR "YouTubePlaylistManager.File\DefaultIcon" "" "$INSTDIR\YouTube Playlist Manager.exe,0"
  WriteRegStr HKCR "YouTubePlaylistManager.File\shell\open\command" "" '"$INSTDIR\YouTube Playlist Manager.exe" "%1"'
  
  ; Register protocol handler
  WriteRegStr HKCR "ytplaylist" "" "URL:YouTube Playlist Manager Protocol"
  WriteRegStr HKCR "ytplaylist" "URL Protocol" ""
  WriteRegStr HKCR "ytplaylist\DefaultIcon" "" "$INSTDIR\YouTube Playlist Manager.exe,0"
  WriteRegStr HKCR "ytplaylist\shell\open\command" "" '"$INSTDIR\YouTube Playlist Manager.exe" "%1"'
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  
  ; Add to Add/Remove Programs
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\YouTube Playlist Manager" "DisplayName" "YouTube Playlist Manager"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\YouTube Playlist Manager" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\YouTube Playlist Manager" "DisplayIcon" "$INSTDIR\YouTube Playlist Manager.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\YouTube Playlist Manager" "DisplayVersion" "${VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\YouTube Playlist Manager" "Publisher" "YouTube Playlist Manager"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\YouTube Playlist Manager" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\YouTube Playlist Manager" "NoRepair" 1
SectionEnd

; Desktop components section
Section "Desktop Shortcut" SecDesktop
  CreateShortcut "$DESKTOP\YouTube Playlist Manager.lnk" "$INSTDIR\YouTube Playlist Manager.exe"
SectionEnd

; Start Menu components section
Section "Start Menu Shortcuts" SecStartMenu
  CreateDirectory "$SMPROGRAMS\YouTube Playlist Manager"
  CreateShortcut "$SMPROGRAMS\YouTube Playlist Manager\YouTube Playlist Manager.lnk" "$INSTDIR\YouTube Playlist Manager.exe"
  CreateShortcut "$SMPROGRAMS\YouTube Playlist Manager\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
SectionEnd

; Optional components descriptions
LangString DESC_SecCore ${LANG_ENGLISH} "Core application files (required)"
LangString DESC_SecDesktop ${LANG_ENGLISH} "Create a desktop shortcut"
LangString DESC_SecStartMenu ${LANG_ENGLISH} "Create Start Menu shortcuts"

; Assign descriptions to sections
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
!insertmacro MUI_DESCRIPTION_TEXT ${SecCore} $(DESC_SecCore)
!insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop} $(DESC_SecDesktop)
!insertmacro MUI_DESCRIPTION_TEXT ${SecStartMenu} $(DESC_SecStartMenu)
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; Uninstaller section
Section "Uninstall"
  ; Remove application files
  RMDir /r "$INSTDIR"
  
  ; Remove shortcuts
  Delete "$DESKTOP\YouTube Playlist Manager.lnk"
  RMDir /r "$SMPROGRAMS\YouTube Playlist Manager"
  
  ; Remove registry entries
  DeleteRegKey HKCU "Software\YouTube Playlist Manager"
  DeleteRegKey HKCR ".ytpm"
  DeleteRegKey HKCR "YouTubePlaylistManager.File"
  DeleteRegKey HKCR "ytplaylist"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\YouTube Playlist Manager"
SectionEnd

; Installation event functions
Function .onInit
  Call CheckPrerequisites
FunctionEnd

Function .onInstSuccess
  ; Notify user of successful installation
  MessageBox MB_ICONINFORMATION "YouTube Playlist Manager has been successfully installed!"
FunctionEnd
