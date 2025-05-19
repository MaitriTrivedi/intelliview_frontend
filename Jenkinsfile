pipeline {
    agent {
        docker {
            image 'node:18-slim'
            args '-v /var/run/docker.sock:/var/run/docker.sock'
        }
    }
    
    environment {
        DOCKER_REGISTRY = 'docker.io/mtrivedi1410'
        IMAGE_NAME = 'intelliview-frontend'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        DOCKER_CREDENTIALS = credentials('DockerHubCredential')
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                dir('intelliview-frontend/intelliview-frontend') {
                    sh '''
                    # Install all dependencies including dev dependencies
                    npm install --include=dev
                    # Run security audit but don't fail if there are advisories
                    npm audit || true
                    '''
                }
            }
        }
        
        stage('Lint') {
            steps {
                dir('intelliview-frontend/intelliview-frontend') {
                    sh '''
                    # Run ESLint in CI mode
                    CI=true npm run lint:ci || true
                    '''
                }
            }
        }
        
        stage('Run Tests') {
            steps {
                dir('intelliview-frontend/intelliview-frontend') {
                    sh '''
                    # Run tests with coverage
                    npm test -- --coverage --watchAll=false --ci --passWithNoTests
                    '''
                }
            }
        }
        
        stage('Build') {
            steps {
                dir('intelliview-frontend/intelliview-frontend') {
                    sh '''
                    # Build with ESLint plugin disabled and CI mode
                    export CI=true
                    export DISABLE_ESLINT_PLUGIN=true
                    npm run build
                    '''
                }
            }
        }
        
        stage('Build Docker Image') {
            agent {
                docker {
                    image 'docker:20.10.16'
                    args '-v /var/run/docker.sock:/var/run/docker.sock'
                }
            }
            steps {
                dir('intelliview-frontend') {
                    sh '''
                    # Build the Docker image without BuildKit
                    docker build -t ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} .
                    docker tag ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest
                    '''
                }
            }
        }
        
        stage('Push Docker Image') {
            agent {
                docker {
                    image 'docker:20.10.16'
                    args '-v /var/run/docker.sock:/var/run/docker.sock'
                }
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'DockerHubCredential', passwordVariable: 'DOCKER_PASSWORD', usernameVariable: 'DOCKER_USERNAME')]) {
                    sh '''
                    echo $DOCKER_PASSWORD | docker login docker.io -u $DOCKER_USERNAME --password-stdin
                    docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                    docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest
                    '''
                }
            }
        }
        
        stage('Deploy to Kubernetes') {
            agent {
                docker {
                    image 'bitnami/kubectl:latest'
                    args '-v /var/run/docker.sock:/var/run/docker.sock'
                }
            }
            steps {
                sh '''
                kubectl get namespace intelliview || kubectl create namespace intelliview
                
                cat <<EOF | kubectl apply -f -
                apiVersion: apps/v1
                kind: Deployment
                metadata:
                  name: intelliview-frontend
                  namespace: intelliview
                spec:
                  replicas: 2
                  selector:
                    matchLabels:
                      app: intelliview-frontend
                  template:
                    metadata:
                      labels:
                        app: intelliview-frontend
                    spec:
                      securityContext:
                        runAsNonRoot: true
                        runAsUser: 1001
                        fsGroup: 1001
                      containers:
                      - name: intelliview-frontend
                        image: ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                        ports:
                        - containerPort: 80
                        env:
                        - name: REACT_APP_API_URL
                          value: "http://intelliview-backend-service"
                        - name: REACT_APP_LLM_SERVICE_URL
                          value: "http://intelliview-backend-service/api/llm"
                        resources:
                          limits:
                            cpu: "300m"
                            memory: "256Mi"
                          requests:
                            cpu: "100m"
                            memory: "128Mi"
                        securityContext:
                          allowPrivilegeEscalation: false
                          capabilities:
                            drop:
                            - ALL
                          readOnlyRootFilesystem: true
                        livenessProbe:
                          httpGet:
                            path: /
                            port: 80
                          initialDelaySeconds: 10
                          periodSeconds: 30
                        readinessProbe:
                          httpGet:
                            path: /
                            port: 80
                          initialDelaySeconds: 5
                          periodSeconds: 10
                EOF
                
                cat <<EOF | kubectl apply -f -
                apiVersion: v1
                kind: Service
                metadata:
                  name: intelliview-frontend-service
                  namespace: intelliview
                spec:
                  selector:
                    app: intelliview-frontend
                  ports:
                  - port: 80
                    targetPort: 80
                  type: ClusterIP
                EOF
                
                cat <<EOF | kubectl apply -f -
                apiVersion: networking.k8s.io/v1
                kind: Ingress
                metadata:
                  name: intelliview-ingress
                  namespace: intelliview
                  annotations:
                    nginx.ingress.kubernetes.io/rewrite-target: /
                    nginx.ingress.kubernetes.io/ssl-redirect: "true"
                    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
                spec:
                  rules:
                  - host: intelliview.example.com
                    http:
                      paths:
                      - path: /
                        pathType: Prefix
                        backend:
                          service:
                            name: intelliview-frontend-service
                            port:
                              number: 80
                          - path: /api
                            pathType: Prefix
                            backend:
                              service:
                                name: intelliview-backend-service
                                port:
                                  number: 80
                EOF
                
                kubectl rollout status deployment/intelliview-frontend -n intelliview --timeout=300s
                '''
            }
        }
    }
    
    post {
        always {
            sh 'docker logout ${DOCKER_REGISTRY}'
            cleanWs()
        }
        success {
            echo 'Frontend pipeline completed successfully!'
        }
        failure {
            echo 'Frontend pipeline failed!'
        }
    }
} 